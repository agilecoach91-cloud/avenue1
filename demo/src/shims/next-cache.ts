import { requestRefresh } from "../demo/router-core";

export function revalidatePath(_path?: string, _type?: string) {
  requestRefresh();
}
export function revalidateTag(_tag?: string) {
  requestRefresh();
}
