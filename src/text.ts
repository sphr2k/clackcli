import type { Activity, Reporter } from "./interactive";
import type { Runtime } from "./runtime";

const ANSI_CONTROL_SEQUENCE = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\](?:(?!\u0007|\u001b\\|\u009c)[\s\S])*(?:\u0007|\u001b\\|\u009c)|\u001b[PX^_][\s\S]*?\u001b\\|\u001b[ -/]*[0-~]|\u009b[0-?]*[ -/]*[@-~]|[\u0090\u0098\u009e\u009f][\s\S]*?(?:\u009c|\u001b\\)|\u009d(?:(?!\u0007|\u001b\\|\u009c)[\s\S])*(?:\u0007|\u001b\\|\u009c)|[\u0080-\u009f]/g;

function singleLine(value: string): string {
  return value
    .replace(ANSI_CONTROL_SEQUENCE, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "");
}

export function createTextReporter(runtime: Runtime): Reporter {
  return {
    start(message): Activity {
      runtime.stderr.write(`[start] ${singleLine(message)}\n`);
      return {
        message: (progress) => runtime.stderr.write(`[progress] ${singleLine(progress)}\n`),
        complete: (result) => runtime.stderr.write(`[done] ${singleLine(result)}\n`),
        fail: (error) => runtime.stderr.write(`[failed] ${singleLine(error)}\n`),
      };
    },
  };
}
