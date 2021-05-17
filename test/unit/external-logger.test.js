import ExternalLogger from "../../external-logger";
import LocalMessaging from "../../local-messaging";

describe("ExternalLogger", () => {
  let externalLogger = null;
  let localMessaging = null;
  beforeEach(() => {
    console.log = jest.fn();

    top.RiseVision = {};
    top.RiseVision.Viewer = {};
    top.RiseVision.Viewer.LocalMessaging = {
      write: (message) => {},
      receiveMessages: (handler) => {},
      canConnect: () => {return true;}
    };

    top.RiseVision.Viewer.LocalMessaging.write = jest.genMockFn();
    top.RiseVision.Viewer.LocalMessaging.receiveMessages = jest.genMockFn();

    localMessaging = new LocalMessaging();
    externalLogger = new ExternalLogger(localMessaging, "project-name", "dataset-name", "failed-entryfile", "table", "component-name", "component-id");
  });

  describe("initialization", () => {
    it("should create an instance of external-logger with a log function", () => {
      externalLogger = new ExternalLogger(localMessaging, "a", "b", "c", "d", "e", "f");
      expect(externalLogger.hasOwnProperty("log")).toBeTruthy;
      expect(externalLogger.projectName).toBe("a");
      expect(externalLogger.datasetName).toBe("b");
      expect(externalLogger.failedEntryFile).toBe("c");
      expect(externalLogger.table).toBe("d");
      expect(externalLogger.componentName).toBe("e");
      expect(externalLogger.componentId).toBe("f");
    });
  });

  describe("message validation", () => {
    it("should not send message to LM and log if message.event is invalid", () => {
      externalLogger.log("", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ event is required");
      expect(top.RiseVision.Viewer.LocalMessaging.write).not.toHaveBeenCalled();
    });

    it("should not send message to LM and log if message.details is invalid", () => {
      externalLogger.log("event", {});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ detail is required");
      expect(top.RiseVision.Viewer.LocalMessaging.write).not.toHaveBeenCalled();
    });

    it("should not send message to LM and log if message.data.projectName is invalid", () => {
      externalLogger = new ExternalLogger(localMessaging, "", "dataset-name", "failed-entryfile", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ project name is required");
      expect(top.RiseVision.Viewer.LocalMessaging.write).not.toHaveBeenCalled();
    });

    it("should not send message to LM and log if message.data.datasetName is invalid", () => {
      externalLogger = new ExternalLogger(localMessaging, "project-name", "", "failed-entryfile", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ dataset name is required");
      expect(top.RiseVision.Viewer.LocalMessaging.write).not.toHaveBeenCalled();
    });

    it("should not send message to LM and log if message.data.failedEntryFile is invalid", () => {
      externalLogger = new ExternalLogger(localMessaging, "project-name", "dataset-name", "", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ failed entry file is required");
      expect(top.RiseVision.Viewer.LocalMessaging.write).not.toHaveBeenCalled();
    });

    xit("should not send message to LM if local messaging not instantiated", () => {
      externalLogger = new ExternalLogger(null, "project-name", "dataset-name", "", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).not.toBeCalled();
      expect(top.RiseVision.Viewer.LocalMessaging.write).not.toHaveBeenCalled();
    });
  });

  xdescribe("external logging through LM", () => {
    it("should send message to LM and log to BQ", () => {
      let expectedMessage = {
        topic: 'log',
        data: {
          'projectName': 'project-name',
          'datasetName': 'dataset-name',
          'failedEntryFile': 'failed-entryfile',
          'table': 'table',
          'data': {
            'component_name': 'component-name',
            'event': 'event',
            "detail": "testDetail",
            "display_id": "preview",
            "company_id": "",
            "component_id": "component-id"
          }
        }
      };

      externalLogger.log("event", {"detail": "testDetail"});
      expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith(expectedMessage);
    });
  });
});
