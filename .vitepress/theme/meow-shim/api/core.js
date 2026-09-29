// 替掉 @tauri-apps/api/core：invoke 走网页实现，convertFileSrc 变成拼 base 的路径。
import { invoke as callBackend, fileSrc } from '../backend.js'

export function invoke(cmd, args) {
  return callBackend(cmd, args)
}

export function convertFileSrc(path) {
  return fileSrc(path)
}
