let displaySettings = {};
let companySettings = {};

export default class ExternalLogger {
  constructor(localMessaging, projectName, datasetName, failedEntryFile, table, componentName, componentId) {
    this.localMessaging = localMessaging;

    this.projectName = projectName;
    this.datasetName = datasetName;
    this.failedEntryFile = failedEntryFile;
    this.table = table;
    this.componentName = componentName;
    this.componentId = componentId;
  }

  _validateMessage(message, detail) {
    let error = "";

    if (!message){
      error = "Message is required";
    } else if (!message.data.projectName) {
      error = "BQ project name is required";
    } else if (!message.data.datasetName) {
      error = "BQ dataset name is required";
    } else if (!message.data.failedEntryFile) {
      error = "BQ failed entry file is required";
    } else if (!message.data.table) {
      error = "BQ table is required";
    } else if (!message.data.data.event) {
      error = "BQ event is required";
    } else if (!Object.keys(detail).length){
      error = "BQ detail is required";
    }

    return error;
}

  _constructMessage(evt, detail) {
    const displayId = displaySettings.displayid || displaySettings.tempdisplayid || detail.display_id || "preview";
    const companyId = companySettings.companyid || companySettings.tempcompanyid || detail.company_id || "";

    const data = Object.assign({}, {"event": evt, "display_id": displayId, "company_id": companyId, "component_name": this.componentName, "component_id": this.componentId}, detail);

    return {
        "topic": "log",
        "data": {
          "projectName": this.projectName,
          "datasetName": this.datasetName,
          "failedEntryFile": this.failedEntryFile,
          "table": this.table,
          "data": data
        }
      };
  }

  _logEndpointEvent(message, endpointLoggingFields) {
    if (!endpointLoggingFields || !this._hasViewerEndpointLogging()) { return; }

    const { event_details, version } = message.data.data;
    const { severity, errorCode } = endpointLoggingFields;
    const idObj = {component_id: this.componentId};

    if (!event_details || !severity) {
      return console.error ("invalid endpoint logging attempt");
    }

    const debugInfo = endpointLoggingFields.debugInfo ? Object.assign({}, endpointLoggingFields.debugInfo, idObj) : idObj;

    window.top.RiseVision.Viewer.Logger.logTemplateEvent({
      severity,
      eventApp: this.componentName,
      eventAppVersion: version,
      eventDetails: event_details || null,
      eventErrorCode: errorCode || null,
      debugInfo: JSON.stringify( debugInfo )
    });
  }

  _hasViewerEndpointLogging() {
    let hasIt = false;

    try {
      hasIt = window.top &&
        window.top.RiseVision &&
        window.top.RiseVision.Viewer &&
        window.top.RiseVision.Viewer.Logger &&
        window.top.RiseVision.Viewer.Logger.logTemplateEvent;
    } catch(err) {
      hasIt = false;
      if (console.debug) {console.debug(err);}
    }

    return hasIt;
  }

  _hasViewerEndpointHeartbeats() {
    let hasIt = false;

    try {
      hasIt = window.top &&
        window.top.RiseVision &&
        window.top.RiseVision.Viewer &&
        window.top.RiseVision.Viewer.Logger &&
        window.top.RiseVision.Viewer.Logger.recordUptimeHeartbeat;
    } catch(err) {
      hasIt = false;
      if (console.debug) {console.debug(err);}
    }

    return hasIt;
  }

  log(evt, detail, endpointLoggingFields) {
    if (!this.localMessaging) { return; }

    const message = this._constructMessage(evt, detail);

    const errorMessage = this._validateMessage(message, detail);

    if (!errorMessage && this.localMessaging.canConnect()) {
      this.localMessaging.broadcastMessage(message);
      this._logEndpointEvent(message, endpointLoggingFields);
    } else {
      console.log(`external-logger error - ${this.componentName + " component" || "source component undefined"}: ${errorMessage}`);
    }
  }

  setDisplaySettings(settings) {
    displaySettings = settings;
  }

  setCompanySettings(settings) {
    companySettings = settings;
  }

  startEndpointHeartbeats(eventApp, version) {
    if (!this._hasViewerEndpointHeartbeats()) { return; }

    var interval = window.top.RiseVision.Viewer.Logger.heartbeatInterval();
    var heartbeatFn = window.top.RiseVision.Viewer.Logger.recordUptimeHeartbeat;
    var boundHeartbeatFn = heartbeatFn.bind(null, {
      eventApp: eventApp,
      eventAppVersion: version
    });

    boundHeartbeatFn();
    setInterval(boundHeartbeatFn, interval);
  }
}
