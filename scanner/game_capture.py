"""Find MapleStory.exe through documented Win32 APIs and crop its visible client.
No game memory reads, injection, mouse movement or keyboard input.
"""
import ctypes, ntpath, re, sys, threading
from ctypes import wintypes
from dataclasses import dataclass
from PIL import Image

class CaptureUnavailable(ValueError):
    pass

@dataclass(frozen=True)
class GameWindow:
    hwnd: int
    pid: int
    rect: tuple


def choose_window(windows, foreground_pid=None, previous_hwnd=None):
    # The main client is the largest visible window per process, not its tooltip.
    clients={}
    for window in windows:
        old=clients.get(window.pid)
        area=lambda w:(w.rect[2]-w.rect[0])*(w.rect[3]-w.rect[1])
        if old is None or area(window)>area(old):clients[window.pid]=window
    if foreground_pid in clients:return clients[foreground_pid]
    for window in clients.values():
        if window.hwnd==previous_hwnd:return window
    if len(clients)==1:return next(iter(clients.values()))
    if not clients:raise CaptureUnavailable('MapleStory.exe not found or minimized. Open or restore the game; capture will reconnect automatically.')
    raise CaptureUnavailable('Multiple MapleStory.exe clients found. Bring the client you want to the foreground once.')


def crop_rectangle(client, desktop):
    left,top,right,bottom=client
    dl,dt,dr,db=desktop
    if right<=left or bottom<=top or not (dl<=left<right<=dr and dt<=top<bottom<=db):
        raise CaptureUnavailable('Keep the whole MapleStory window on one monitor so every shop field can be captured.')
    return left-dl,top-dt,right-dl,bottom-dt


class WindowsGameFinder:
    def __init__(self):
        if sys.platform!='win32':raise CaptureUnavailable('Live game capture requires Windows.')
        self.user=ctypes.WinDLL('user32',use_last_error=True)
        self.kernel=ctypes.WinDLL('kernel32',use_last_error=True)
        self.callback=ctypes.WINFUNCTYPE(wintypes.BOOL,wintypes.HWND,wintypes.LPARAM)
        signatures={
            'EnumWindows':([self.callback,wintypes.LPARAM],wintypes.BOOL),
            'IsWindowVisible':([wintypes.HWND],wintypes.BOOL),
            'IsIconic':([wintypes.HWND],wintypes.BOOL),
            'GetWindowThreadProcessId':([wintypes.HWND,ctypes.POINTER(wintypes.DWORD)],wintypes.DWORD),
            'GetForegroundWindow':([],wintypes.HWND),
            'GetClientRect':([wintypes.HWND,ctypes.POINTER(wintypes.RECT)],wintypes.BOOL),
            'ClientToScreen':([wintypes.HWND,ctypes.POINTER(wintypes.POINT)],wintypes.BOOL),
            'WindowFromPoint':([wintypes.POINT],wintypes.HWND),
            'GetCursorPos':([ctypes.POINTER(wintypes.POINT)],wintypes.BOOL),
            'GetAsyncKeyState':([ctypes.c_int],ctypes.c_short),
        }
        for name,(args,result) in signatures.items():
            function=getattr(self.user,name);function.argtypes=args;function.restype=result
        self.kernel.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];self.kernel.OpenProcess.restype=wintypes.HANDLE
        self.kernel.QueryFullProcessImageNameW.argtypes=[wintypes.HANDLE,wintypes.DWORD,wintypes.LPWSTR,ctypes.POINTER(wintypes.DWORD)];self.kernel.QueryFullProcessImageNameW.restype=wintypes.BOOL
        self.kernel.CloseHandle.argtypes=[wintypes.HANDLE];self.kernel.CloseHandle.restype=wintypes.BOOL

    def pid(self,hwnd):
        value=wintypes.DWORD();self.user.GetWindowThreadProcessId(hwnd,ctypes.byref(value));return value.value

    def executable(self,pid):
        handle=self.kernel.OpenProcess(0x1000,False,pid)  # PROCESS_QUERY_LIMITED_INFORMATION only.
        if not handle:return ''
        try:
            buffer=ctypes.create_unicode_buffer(32768);length=wintypes.DWORD(len(buffer))
            return ntpath.basename(buffer.value).casefold() if self.kernel.QueryFullProcessImageNameW(handle,0,buffer,ctypes.byref(length)) else ''
        finally:self.kernel.CloseHandle(handle)

    def find(self,previous_hwnd=None):
        windows=[];processes={}
        def collect(hwnd,_):
            if not self.user.IsWindowVisible(hwnd) or self.user.IsIconic(hwnd):return True
            pid=self.pid(hwnd)
            if pid not in processes:processes[pid]=self.executable(pid)
            if processes[pid]!='maplestory.exe':return True
            rect=wintypes.RECT()
            if not self.user.GetClientRect(hwnd,ctypes.byref(rect)) or rect.right<=rect.left or rect.bottom<=rect.top:return True
            origin=wintypes.POINT(rect.left,rect.top)
            if self.user.ClientToScreen(hwnd,ctypes.byref(origin)):
                windows.append(GameWindow(hwnd,pid,(origin.x,origin.y,origin.x+rect.right-rect.left,origin.y+rect.bottom-rect.top)))
            return True
        callback=self.callback(collect)
        if not self.user.EnumWindows(callback,0):raise CaptureUnavailable('Windows could not enumerate game windows.')
        return choose_window(windows,self.pid(self.user.GetForegroundWindow()),previous_hwnd)

    def unobscured(self,window):
        left,top,right,bottom=window.rect
        points=[(left+2,top+2),(right-3,top+2),(left+2,bottom-3),(right-3,bottom-3),((left+right)//2,(top+bottom)//2)]
        return all(self.pid(self.user.WindowFromPoint(wintypes.POINT(x,y)))==window.pid for x,y in points)

    def cursor(self,origin,size):
        point=wintypes.POINT()
        if not self.user.GetCursorPos(ctypes.byref(point)):return None,False
        xy=(point.x-origin[0],point.y-origin[1])
        if not (0<=xy[0]<size[0] and 0<=xy[1]<size[1]):return None,False
        return xy,bool(self.user.GetAsyncKeyState(1)&0x8000)


class GameCapture:
    def __init__(self,finder=None,dxcam_module=None):
        self.finder=finder or WindowsGameFinder()
        if dxcam_module is None:
            import dxcam
            dxcam_module=dxcam
        self.lock=threading.RLock();self.closed=False
        self.dxcam=dxcam_module;self.cameras={};self.window=None;self.origin=None;self.size=None;self.display=''

    def frame(self):
        with self.lock:
            if self.closed:raise CaptureUnavailable('Game capture is stopped.')
            return self._frame()

    def _frame(self):
        window=self.finder.find(self.window.hwnd if self.window else None)
        if not self.finder.unobscured(window):raise CaptureUnavailable('MapleStory is covered by another window. Keep the game visible; capture will resume automatically.')
        pairs=[(int(d),int(o)) for d,o in re.findall(r'Device\[(\d+)\]\s+Output\[(\d+)\]',self.dxcam.output_info())]
        failures=[]
        for pair in pairs:
            try:
                camera=self.cameras.get(pair)
                if camera is None:
                    camera=self.dxcam.create(device_idx=pair[0],output_idx=pair[1],output_color='RGB',processor_backend='numpy');self.cameras[pair]=camera
                camera._output.update_desc()
                bounds=camera._output.desc.DesktopCoordinates
                desktop=(bounds.left,bounds.top,bounds.right,bounds.bottom)
                try:region=crop_rectangle(window.rect,desktop)
                except CaptureUnavailable:continue
                array=camera.grab(new_frame_only=False)
                if array is None:raise CaptureUnavailable('MapleStory display returned no frame. Try windowed or borderless mode.')
                full=Image.fromarray(array)
                if region[2]>full.width or region[3]>full.height:raise CaptureUnavailable('Display resolution is changing. Waiting for a fresh frame.')
                image=full.crop(region)
                if image.getbbox() is None:raise CaptureUnavailable('Game capture is black. Restore MapleStory or try windowed/borderless mode.')
                if image.size!=(window.rect[2]-window.rect[0],window.rect[3]-window.rect[1]):raise CaptureUnavailable('Game capture size changed. Waiting for a fresh frame.')
                self.window=window;self.origin=window.rect[:2];self.size=image.size
                self.display=str(camera._output.desc.DeviceName).replace('\\\\.\\','')
                return image
            except Exception as exc:failures.append(str(exc))
        raise CaptureUnavailable(failures[-1] if failures else 'MapleStory display was not found. Keep the game fully on one connected monitor.')

    def cursor(self):
        return self.finder.cursor(self.origin,self.size) if self.origin and self.size else (None,False)

    def close(self):
        with self.lock:
            self.closed=True
            for camera in self.cameras.values():
                try:camera.release()
                except Exception:pass
            self.cameras.clear()
