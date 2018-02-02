import LocalMessaging from "./local-messaging";

let displaySettings = {};
let companySettings = {};

export default class ExternalLogger {
  constructor(projectName, datasetName, failedEntryFile, table, componentName) {
    this.localMessaging = new LocalMessaging();

    this.projectName = projectName;
    this.datasetName = datasetName;
    this.failedEntryFile = failedEntryFile;
    this.table = table;
    this.componentName = componentName;
  }

  _validateMessage(message, detail) {
    let error = "";

    if (!message){
      error = "Message is required";
    } else if (!message.from) {
      error = "From is required";
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

    const data = Object.assign({}, {"event": evt, "display_id": displayId, "company_id": companyId}, detail);

    return {
        "topic": "log",
        "from": this.componentName,
        "data": {
          "projectName": this.projectName,
          "datasetName": this.datasetName,
          "failedEntryFile": this.failedEntryFile,
          "table": this.table,
          "data": data
        }
      };
  }

  log(evt, detail) {
    const message = this._constructMessage(evt, detail);

    const errorMessage = this._validateMessage(message, detail);

    if (!errorMessage && this.localMessaging.canConnect()) {
      console.log(message);
      this.localMessaging.broadcastMessage(message);
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
}