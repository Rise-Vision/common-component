export default class RiseContentSentinel {
  constructor(eventsHandler) {
    this.eventsHandler = eventsHandler;
    this.files = new Map();
    this.folders = new Set();
    this.fileTypes = ["image", "video"];
    this.fileType = "";

    this._bindReceiveMessagesHandler();
  }

  _bindReceiveMessagesHandler() {
    window.addEventListener( "message", event => this._receiveData( event ) );
  }

  _receiveData( event ) {
    const message = event.data;

    if ( !message || !message.topic ) {
      return;
    }

    this._handleMessage( message );
  }

  _handleMessage( message ) {
    switch (message.topic.toUpperCase()) {
      case "FILE-UPDATE":
        return this._handleFileUpdate( message );
      case "FILE-ERROR":
        return this._handleFileError( message );
    }
  }

  _handleFileUpdate(message) {
    if ( !message || !message.filePath || !message.status ) {return;}

    const {filePath, cachePath, status} = message;
    const origin = "https://widgets.risevision.com";
    //use cachePath to form the fileUrl. Fall back to filePath for
    //backwards compartibility with Content Sentinel v1.2.7
    const fileUrl = `${origin}${cachePath || `/${filePath}`}`;
    const watchedFileStatus = this._getWatchedFileStatus(filePath);
    const isFolderPath = this._isFolderPath(filePath);

    // file is not being watched
    if (!watchedFileStatus) {return;}
    // status hasn't changed
    if (watchedFileStatus === status) {return;}

    this.files.set(filePath, status);

    // file is not of assigned filter type, don't notify listener
    if(!isFolderPath && !this._isValidFileType(filePath)) {return;}

    switch (status.toUpperCase()) {
      case "CURRENT":
        this._sendEvent({"event": "file-available", filePath, fileUrl});
        break;
      case "STALE":
        this._sendEvent({"event": "file-processing", filePath});
        break;
      case "NOEXIST":
        if (isFolderPath) {
          this._sendEvent({"event": "folder-no-exist", filePath});
        } else {
          this._sendEvent({"event": "file-no-exist", filePath});
        }
        break;
      case "EMPTYFOLDER":
        this._sendEvent({"event": "folder-empty", filePath});
        break;
      case "DELETED":
        this._sendEvent({"event": "file-deleted", filePath});
        break;
    }
  }

  _handleFileError(message) {
    if (!message || !message.filePath) {return;}

    const {filePath, msg, detail} = message;
    const watchedFileStatus = this._getWatchedFileStatus(filePath);

    // file is not being watched
    if (!watchedFileStatus) {return;}
    // file is not of assigned filter type, don't notify listener
    if(!this._isValidFileType(filePath)) {return;}

    this.files.set(filePath, "file-error");

    this._sendEvent({"event": "file-error", filePath, msg, detail});
  }

  _sendEvent(event) {
    if (!this.eventsHandler || typeof this.eventsHandler !== "function" || !event) {return;}
    this.eventsHandler(event);
  }

  _setFileType(type) {
    // reset file type
    if (type === "") {
      this.fileType = "";
      return;
    }

    // type is not recognized
    if (!type || !this.fileTypes.includes(type)) {return;}

    this.fileType = type;
  }

  _isFolderPath(path) {
    return path.substring(path.length - 1) === "/";
  }

  _watchFolder(folderPath) {
    this.folders.add(folderPath);

    this._send({
      from: "content-consumer",
      to: "content-sentinel-controller",
      msg: "watch",
      filePath: folderPath
    });
  }

  _watchFile(filePath) {
    // file is not of assigned filter type, don't watch the file at all
    if(!this._isValidFileType(filePath)) {return;}

    this.files.set(filePath, "UNKNOWN");

    this._send({
      from: "content-consumer",
      to: "content-sentinel-controller",
      msg: "watch",
      filePath
    });
  }

  _getHttpParameter( name ) {
    try {
      const href = window.location.href;
      const regex = new RegExp( `[?&]${ name }=([^&#]*)`, "i" );
      const match = regex.exec( href );

      return match ? match[ 1 ] : null;
    } catch ( err ) {
      console.log( "can't retrieve HTTP parameter", err );

      return null;
    }
  }

  _getTopLevelViewerWindow() {
    let win = window;
    let found = win;

    while (win.parent && win.parent !== win) {
      win = win.parent;

      if ( win.RiseVision && win.RiseVision.Viewer ) {
        found = win;
      }
    }

    return found;
  }

  _send(message) {
    if (!message) {return;}

    if ( window.parent === window ) {return;}

    const frameElementId = this._getHttpParameter( "frameElementId" ) ?
      this._getHttpParameter( "frameElementId" ) :
      window.frameElement ? window.frameElement.id : "";

    const viewerWindow = this._getTopLevelViewerWindow();

    message.topic = "watch";
    message.frameElementId = frameElementId;

    viewerWindow && viewerWindow.postMessage( message, "*" );
  }

  _getWatchedFileStatus(filePath) {
    let fileStatus = this.files.get(filePath);

    if (!fileStatus) {
      for (let folderPath of this.folders) {
        if (filePath.startsWith(folderPath)) {
          // this is a file from a watched folder, add to file list and mark its status UNKNOWN
          this.files.set(filePath, "UNKNOWN");
          fileStatus = "UNKNOWN";
          break;
        }
      }
    }

    return fileStatus;
  }

  _isValidFileType(filePath) {
    let isValid = false;
    let extensions;

    // no filter set, accept any type
    if (!this.fileType) {return true;}

    switch(this.fileType) {
      case "image":
        extensions = [".jpg", ".jpeg", ".png", ".bmp", ".svg", ".gif", ".webp"];
        break;
      case "video":
        extensions = [".webm", ".mp4"];
        break;
      default:
        extensions = [];
    }

    for (let extension of extensions) {
      if ((filePath.toLowerCase()).endsWith(extension)) {
        isValid = true;
        break;
      }
    }

    return isValid;
  }

  /*
  PUBLIC API
   */

  watchFiles(filePaths, filterByFileType = "") {
    if (!filePaths) {return;}

    this._setFileType(filterByFileType);

    if (typeof filePaths === "string") {
      if (this._isFolderPath(filePaths)) {
        if (!this.folders.has(filePaths)) {
          this._watchFolder(filePaths);
        }
      } else {
        if (!this.files.has(filePaths)) {
          this._watchFile(filePaths);
        }
      }
    } else if (Array.isArray(filePaths)) {
      const filesNotWatched = filePaths.filter(path => !this.files.has(path));
      filesNotWatched.forEach((path) => {
        if (this._isFolderPath(path)) {
          if (!this.folders.has(path)) {
            this._watchFolder(path);
          }
        } else {
          this._watchFile(path);
        }
      });
    }
  }
}
