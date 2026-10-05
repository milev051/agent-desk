import Foundation
import AppKit
let project=Bundle.main.bundleURL.deletingLastPathComponent()
let address=URL(string:"http://127.0.0.1:4317")!
func execute(_ arguments:[String]) -> Int32 {
 let p=Process();p.executableURL=URL(fileURLWithPath:"/bin/launchctl");p.arguments=arguments;p.standardOutput=FileHandle.nullDevice;p.standardError=FileHandle.nullDevice
 do{try p.run();p.waitUntilExit();return p.terminationStatus}catch{return -1}
}
func available() async -> Bool {
 var req=URLRequest(url:address.appendingPathComponent("api/meta"));req.timeoutInterval=1
 guard let (_,r)=try? await URLSession.shared.data(for:req) else{return false}
 return (r as? HTTPURLResponse)?.statusCode==200
}
Task {
 if !(await available()) {
  let fm=FileManager.default,home=fm.homeDirectoryForCurrentUser
  let config=home.appendingPathComponent(".config/agent-desk"),data=project.appendingPathComponent("data")
  try? fm.createDirectory(at:config,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700]);try? fm.createDirectory(at:data,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
  guard let node=["/opt/homebrew/bin/node","/usr/local/bin/node"].first(where:{fm.isExecutableFile(atPath:$0)}) else { await MainActor.run {let alert=NSAlert();alert.messageText="Node nije pronađen.";alert.runModal();NSApplication.shared.terminate(nil)};return }
  let plist:[String:Any]=["Label":"local.agent-desk.server","ProgramArguments":[node,project.appendingPathComponent("server.mjs").path],"WorkingDirectory":project.path,"RunAtLoad":true,"KeepAlive":false,"EnvironmentVariables":["PATH":"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:"+home.appendingPathComponent(".local/bin").path+":"+home.appendingPathComponent(".grok/bin").path],"StandardOutPath":data.appendingPathComponent("server.log").path,"StandardErrorPath":data.appendingPathComponent("server.log").path]
  let file=config.appendingPathComponent("server-launch.plist")
  if let bytes=try? PropertyListSerialization.data(fromPropertyList:plist,format:.xml,options:0){try? bytes.write(to:file,options:.atomic);try? fm.setAttributes([.posixPermissions:0o600],ofItemAtPath:file.path)}
  let domain="gui/\(getuid())"
  if execute(["bootstrap",domain,file.path]) != 0 {_ = execute(["kickstart",domain+"/local.agent-desk.server"])}
 }
 var ready=false
 for _ in 0..<60 {if await available(){ready=true;break};try? await Task.sleep(for:.milliseconds(250))}
 let isReady=ready
 // Chrome u app režimu sa zasebnim profilom: zatvaranje tog prozora gasi server.
 let chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",profile=FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".config/agent-desk/chrome").path
 if isReady && FileManager.default.isExecutableFile(atPath:chrome) {
  let check=Process();check.executableURL=URL(fileURLWithPath:"/usr/bin/pgrep");check.arguments=["-f","--user-data-dir="+profile];check.standardOutput=FileHandle.nullDevice
  let alreadyOpen=((try? check.run()) != nil) && {check.waitUntilExit();return check.terminationStatus==0}()
  let window=Process();window.executableURL=URL(fileURLWithPath:chrome);window.arguments=["--app="+address.absoluteString,"--user-data-dir="+profile,"--no-first-run","--no-default-browser-check"]
  if (try? window.run()) != nil {
   window.waitUntilExit()
   if !alreadyOpen {_ = execute(["bootout","gui/\(getuid())/local.agent-desk.server"])}
   await MainActor.run {NSApplication.shared.terminate(nil)};return
  }
 }
 await MainActor.run {
  if isReady {NSWorkspace.shared.open(address)} else {let alert=NSAlert();alert.messageText="Agent Desk nije pokrenut.";alert.informativeText="Proveri data/server.log.";alert.runModal()}
  NSApplication.shared.terminate(nil)
 }
}
NSApplication.shared.setActivationPolicy(.accessory)
NSApplication.shared.run()
