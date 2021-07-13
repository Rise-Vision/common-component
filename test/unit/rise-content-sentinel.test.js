import RiseContentSentinel from "../../rise-content-sentinel";
import LocalMessaging from "../../local-messaging";
import PlayerLocalStorage from "../../player-local-storage";

describe("RiseContentSentinel", () => {
  const origin = "https://widgets.risevision.com";

  let riseContentSentinel = null;
  let eventHandler = null;

  beforeEach(() => {
    eventHandler = jest.genMockFn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("_handleMessage()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      riseContentSentinel = new RiseContentSentinel(eventHandler);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    describe("FILE-UPDATE", () => {
      beforeEach(()=>{
        eventHandler.mockClear();
      });

      it("should not execute if 'message' does not contain required props", () => {
        const message = {
          "topic": "file-update"
        };

        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);

        message.filePath = "test.png";

        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);

        message.status = "noexist";

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(1);

      });

      it("should not execute if message pertains to a file not being watched", () => {
        const message = {
          "topic": "file-update",
          "filePath": "non-watched-file.png",
          "status": "stale"
        };

        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should execute 'file-available' event on event handler when message status is CURRENT", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test file.png",
          "cachePath": "/test%20file.png",
          "status": "current"
        };

        riseContentSentinel.watchFiles("test file.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-available",
          filePath: message.filePath,
          fileUrl: `${origin}${message.cachePath}`
        });
      });

      it("should use filePath to form the fileUrl if cachePath is missing", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test file.png",
          "status": "current"
        };

        riseContentSentinel.watchFiles("test file.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-available",
          filePath: message.filePath,
          fileUrl: `${origin}/${message.filePath}`
        });
      });

      it("should not execute any event on event handler when watched file status is same as new status", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test.png",
          "status": "current"
        };

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(1);

        eventHandler.mockClear();

        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should execute 'file-processing' event on event handler when status is STALE", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test.png",
          "status": "stale"
        };

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-processing",
          filePath: "test.png"
        });
      });

      it("should execute event on handler when message pertains to file not being watched but is from a watched folder", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test-bucket/test-folder/watched-folder-test-file.png",
          "status": "stale"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-processing",
          filePath: "test-bucket/test-folder/watched-folder-test-file.png"
        });
      });

      it("should execute event on handler when message pertains to file being watched and is valid file type", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test-bucket/test-folder/test-image-file.png",
          "status": "stale"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/", "image");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-processing",
          filePath: "test-bucket/test-folder/test-image-file.png"
        });
      });

      it("should not execute event on handler when message pertains to file not being watched and is not from a watched folder", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test-bucket/test-folder-2/unwatched-folder-test-file.png",
          "status": "stale"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should not execute event on handler when message pertains to file being watched but is not a valid file type", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test-bucket/test-folder/test-image-file.png",
          "status": "stale"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/", "video");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should execute 'file-no-exist' event on event handler when status is NOEXIST", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test.png",
          "status": "noexist"
        };

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-no-exist",
          filePath: "test.png"
        });
      });

      it("should execute 'folder-no-exist' event on event handler when status is NOEXIST and is a watched folder", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test-bucket/test-folder-no-exist/",
          "status": "noexist"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder-no-exist/", "image");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "folder-no-exist",
          filePath: "test-bucket/test-folder-no-exist/"
        });
      });

      it("should execute 'folder-empty' event on event handler when status is EMPTYFOLDER and is a watched folder", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test-bucket/test-folder-empty/",
          "status": "emptyfolder"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder-empty/");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "folder-empty",
          filePath: "test-bucket/test-folder-empty/"
        });
      });

      it("should execute 'file-deleted' event on event handler when status is DELETED", () => {
        const message = {
          "topic": "file-update",
          "filePath": "test.png",
          "status": "deleted"
        };

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-deleted",
          filePath: "test.png"
        });
      });
    });

    describe("FILE-ERROR", () => {
      beforeEach(()=>{
        eventHandler.mockClear();
      });

      it("should not execute if 'message' does not contain filePath prop", () => {
        const message = {
          "topic": "file-error"
        };

        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should not execute if message pertains to a file not being watched", () => {
        const message = {
          "topic": "file-error",
          "filePath": "non-watched-file.png",
          "msg": "Insufficient disk space"
        };

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should execute 'file-error' event on event handler", () => {
        const message = {
          "topic": "file-error",
          "filePath": "test.png",
          "msg": "Could not retrieve signed URL",
          "detail": "Some response details"
        };

        riseContentSentinel.watchFiles("test.png");
        riseContentSentinel._handleMessage(message);
        expect(riseContentSentinel._getWatchedFileStatus("test.png")).toBe("file-error");
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-error",
          filePath: message.filePath,
          msg: message.msg,
          detail: message.detail
        });
      });

      it("should execute 'file-error' event on event handler when message pertains to file not being watched but is from a watched folder", () => {
        const message = {
          "topic": "file-error",
          "filePath": "test-bucket/test-folder/watched-folder-test-file.png",
          "msg": "Could not retrieve signed URL",
          "detail": "Some response details"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-error",
          filePath: message.filePath,
          msg: message.msg,
          detail: message.detail
        });
      });

      it("should execute 'file-error' event on event handler when message pertains to file watched and is valid file type", () => {
        const message = {
          "topic": "file-error",
          "filePath": "test-bucket/test-folder/test-image-file.png",
          "msg": "Could not retrieve signed URL",
          "detail": "Some response details"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/", "image");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledWith({
          event: "file-error",
          filePath: message.filePath,
          msg: message.msg,
          detail: message.detail
        });
      });

      it("should not execute event on handler when message pertains to file not being watched and is not from a watched folder", () => {
        const message = {
          "topic": "file-error",
          "filePath": "test-bucket/test-folder-2/unwatched-folder-test-file.png",
          "msg": "Could not retrieve signed URL",
          "detail": "Some response details"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });

      it("should not execute event on handler when message pertains to file being watched but is not a valid file type", () => {
        const message = {
          "topic": "file-error",
          "filePath": "test-bucket/test-folder/test-image-file.png",
          "msg": "Could not retrieve signed URL",
          "detail": "Some response details"
        };

        riseContentSentinel.watchFiles("test-bucket/test-folder/", "video");
        riseContentSentinel._handleMessage(message);
        expect(eventHandler).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("_isFolderPath()", () => {
    beforeEach(()=>{
      riseContentSentinel = new RiseContentSentinel(eventHandler);
    });

    it("should return true", () => {
      expect(riseContentSentinel._isFolderPath("test-bucket/test-folder/")).toBeTruthy();
    });

    it("should return false", () => {
      expect(riseContentSentinel._isFolderPath("test-bucket/test-file.png")).toBeFalsy();
    });

  });

  describe("_isValidFileType()", () => {
    beforeEach(()=>{
      riseContentSentinel = new RiseContentSentinel(eventHandler);
    });

    it("should return true for a valid image file", () => {
      riseContentSentinel._setFileType("image");

      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.jpg")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.jpeg")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.png")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.bmp")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.svg")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.gif")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.webp")).toBeTruthy();
    });

    it("should return true for a valid video file", () => {
      riseContentSentinel._setFileType("video");

      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.webm")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.mp4")).toBeTruthy();
    });

    it("should return false for an invalid image file", () => {
      riseContentSentinel._setFileType("image");

      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.jpg.webm")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.webm")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.mp4")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.ogv")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.ogg")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.html")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.js")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.css")).toBeFalsy();
    });

    it("should return false for an invalid video file", () => {
      riseContentSentinel._setFileType("video");

      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.webm.jpg")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.jpg")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.jpeg")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.png")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.bmp")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.svg")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.gif")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.webp")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.html")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.js")).toBeFalsy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.css")).toBeFalsy();
    });

    it("should return true when no filter file type set", () => {
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.jpg")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.webm")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.png")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.mp4")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.svg")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.gif")).toBeTruthy();
      expect(riseContentSentinel._isValidFileType("test-bucket/test-file.html")).toBeTruthy();
    });
  });

  describe("_watchFile()", () => {
    beforeEach(()=>{
      riseContentSentinel = new RiseContentSentinel(eventHandler);
      riseContentSentinel._send = jest.genMockFn();
    });

    it("should send WATCH of single file", () => {
      riseContentSentinel._watchFile("test.png");

      expect(riseContentSentinel._send).toHaveBeenCalledWith({
        "filePath": "test.png",
        "from": "content-consumer",
        "msg": "watch",
        "to": "content-sentinel-controller"
      });
    });
  });

  describe("_watchFolder()", () => {
    beforeEach(()=>{
      riseContentSentinel = new RiseContentSentinel(eventHandler);
      riseContentSentinel._send = jest.genMockFn();
    });

    it("should broadcast WATCH of a folder", () => {
      riseContentSentinel._watchFolder("test-bucket/test-folder/");

      expect(riseContentSentinel._send).toHaveBeenCalledWith({
        "from": "content-consumer",
        "msg": "watch",
        "to": "content-sentinel-controller",
        "filePath": "test-bucket/test-folder/"
      });
    });
  });

  describe("watchFiles()", () => {

    it("should not execute if filePaths params is falsy", () => {
      riseContentSentinel = new RiseContentSentinel(eventHandler);

      const spyFile = jest.spyOn(riseContentSentinel, '_watchFile');
      const spyFolder = jest.spyOn(riseContentSentinel, '_watchFolder');

      riseContentSentinel.watchFiles("");

      expect(spyFile).toHaveBeenCalledTimes(0);
      expect(spyFolder).toHaveBeenCalledTimes(0);

      spyFile.mockReset();
      spyFile.mockRestore();
      spyFolder.mockReset();
      spyFolder.mockRestore();
    });

    it("should watch one single file provided as a param string", () => {
      riseContentSentinel = new RiseContentSentinel(eventHandler);

      const spy = jest.spyOn(riseContentSentinel, '_watchFile');

      riseContentSentinel.watchFiles("test.png");

      expect(spy).toHaveBeenCalledWith("test.png");

      spy.mockReset();
      spy.mockRestore();
    });

    it("should start watching multiple single files", () => {
      const spy = jest.spyOn(riseContentSentinel, '_watchFile');

      riseContentSentinel.watchFiles(["test1.png", "test2.png"]);

      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockReset();
      spy.mockRestore();
    });

    it("should only send watch of single files that aren't already being watched", () => {
      const spy = jest.spyOn(riseContentSentinel, '_watchFile');

      riseContentSentinel.watchFiles(["test.png", "test1.png", "test2.png", "test3.png"]);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test3.png");

      spy.mockReset();
      spy.mockRestore();
    });

    it("should watch one single folder provided as a param string", () => {
      const spy = jest.spyOn(riseContentSentinel, '_watchFolder');

      riseContentSentinel.watchFiles("test-bucket/test-folder/");

      expect(spy).toHaveBeenCalledWith("test-bucket/test-folder/");

      spy.mockReset();
      spy.mockRestore();
    });

    it("should start watching multiple folders", () => {
      const spy = jest.spyOn(riseContentSentinel, '_watchFolder');

      riseContentSentinel.watchFiles(["test-bucket/test-folder-1/", "test-bucket/test-folder-2/", "test-bucket/test-folder-3/"]);

      expect(spy).toHaveBeenCalledTimes(3);

      spy.mockReset();
      spy.mockRestore();
    });

    it("should only send watch of folders that aren't already being watched", () => {
      const spy = jest.spyOn(riseContentSentinel, '_watchFolder');

      riseContentSentinel.watchFiles(["test-bucket/test-folder-1/", "test-bucket/test-folder-2/", "test-bucket/test-folder-3/", "test-bucket/test-folder-4/"]);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test-bucket/test-folder-4/");

      spy.mockReset();
      spy.mockRestore();
    });

    it("should call _setFileType()", () => {
      const spy = jest.spyOn(riseContentSentinel, '_setFileType');

      riseContentSentinel.watchFiles("test-bucket/test-filter-type.png", "image");

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("image");

      spy.mockReset();
      spy.mockRestore();
    });
  });

  describe("_getTopLevelViewerWindow()", () => {
    let windowSpy;

    beforeEach(() => {
      windowSpy = jest.spyOn(window, "window", "get");
    });

    afterEach(() => {
      windowSpy.mockRestore();
    });

    it("should find the top level viewer window", () => {
      const viewer = {
        contentSentinelInitializer: true,
        parent: {}
      };
      windowSpy.mockImplementation(() => ({
        parent: {
          parent: {
            parent: viewer
          }
        }
      }));

      const top = riseContentSentinel._getTopLevelViewerWindow();

      expect(top).toEqual(viewer);
    });

    it("should return top level if flag was not found", () => {
      const viewer = {};
      windowSpy.mockImplementation(() => ({
        parent: {
          parent: {
            parent: viewer
          }
        }
      }));

      const top = riseContentSentinel._getTopLevelViewerWindow();

      expect(top).toEqual(viewer);
    });
  });

});
