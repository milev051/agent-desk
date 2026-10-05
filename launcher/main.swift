import Foundation
import AppKit
import WebKit
// Instalirana aplikacija koristi isti projekat i podatke kao lokalni pokretač.
let project:URL = {
 if let file=Bundle.main.url(forResource:"project-path",withExtension:"txt"),let value=try? String(contentsOf:file,encoding:.utf8),!value.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty {
  return URL(fileURLWithPath:value.trimmingCharacters(in:.whitespacesAndNewlines),isDirectory:true)
 }
 return Bundle.main.bundleURL.deletingLastPathComponent()
}()
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
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {
 var window:NSWindow!
 var web:WKWebView!
 func applicationDidFinishLaunching(_ notification:Notification) {
  let menu=NSMenu(),appMenu=NSMenu(),appItem=NSMenuItem()
  let settings=NSMenuItem(title:"Podešavanja…",action:#selector(openSettings),keyEquivalent:",");settings.target=self;appMenu.addItem(settings);appMenu.addItem(.separator())
  appMenu.addItem(withTitle:"Zatvori Agent Desk",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q")
  appItem.submenu=appMenu;menu.addItem(appItem)
  let edit=NSMenu(title:"Uređivanje"),editItem=NSMenuItem(title:"Uređivanje",action:nil,keyEquivalent:"")
  for (title,action,key) in [("Poništi","undo:","z"),("Iseci","cut:","x"),("Kopiraj","copy:","c"),("Nalepi","paste:","v"),("Izaberi sve","selectAll:","a")] {edit.addItem(withTitle:title,action:NSSelectorFromString(action),keyEquivalent:key)}
  editItem.submenu=edit;menu.addItem(editItem)
  let view=NSMenu(title:"Prikaz"),viewItem=NSMenuItem(title:"Prikaz",action:nil,keyEquivalent:"")
  let reload=NSMenuItem(title:"Osveži",action:#selector(refresh),keyEquivalent:"r");reload.target=self;view.addItem(reload);viewItem.submenu=view;menu.addItem(viewItem)
  NSApplication.shared.mainMenu=menu
  let config=WKWebViewConfiguration()
  config.userContentController.add(self,name:"copyText")
  config.userContentController.addUserScript(WKUserScript(source:"Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => window.webkit.messageHandlers.copyText.postMessage(String(text))}, configurable: true});",injectionTime:.atDocumentStart,forMainFrameOnly:true))
  web=WKWebView(frame:.zero,configuration:config);web.uiDelegate=self;web.navigationDelegate=self
  web.setValue(false,forKey:"drawsBackground")
  window=NSWindow(contentRect:NSRect(x:0,y:0,width:1180,height:800),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
  window.title="Agent Desk";window.minSize=NSSize(width:440,height:400);window.contentView=web
  if let screen=NSScreen.main {window.setFrame(screen.visibleFrame,display:true)}else{window.center()}
  window.makeKeyAndOrderFront(nil)
  NSApplication.shared.activate(ignoringOtherApps:true)
  web.loadHTMLString("<html style='background:#111;color:#ddd;font:16px system-ui'><body style='display:grid;place-items:center;height:90vh'>Povezivanje…</body></html>",baseURL:nil)
  Task { await startServer() }
 }
 @objc func openSettings(){web.evaluateJavaScript("if(document.querySelector('#defaults')?.hidden && !document.querySelector('dialog[open]'))document.querySelector('#defaults-open')?.click();",completionHandler:nil)}
 @objc func refresh(){web.reload()}
 func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool {true}
 func applicationShouldHandleReopen(_ sender:NSApplication,hasVisibleWindows flag:Bool)->Bool {window.makeKeyAndOrderFront(nil);return true}
 func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage) {
  guard message.frameInfo.isMainFrame,message.frameInfo.securityOrigin.host=="127.0.0.1",let text=message.body as? String else{return}
  NSPasteboard.general.clearContents();NSPasteboard.general.setString(text,forType:.string)
 }
 func webView(_ webView:WKWebView,runOpenPanelWith parameters:WKOpenPanelParameters,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping ([URL]?)->Void) {
  let panel=NSOpenPanel();panel.allowsMultipleSelection=parameters.allowsMultipleSelection;panel.canChooseDirectories=parameters.allowsDirectories;panel.canChooseFiles=true
  panel.beginSheetModal(for:window){result in completionHandler(result == .OK ? panel.urls:nil)}
 }
 func webView(_ webView:WKWebView,createWebViewWith configuration:WKWebViewConfiguration,for navigationAction:WKNavigationAction,windowFeatures:WKWindowFeatures)->WKWebView? {
  if let url=navigationAction.request.url {NSWorkspace.shared.open(url)};return nil
 }
 func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping (WKNavigationActionPolicy)->Void) {
  guard let url=navigationAction.request.url else{decisionHandler(.cancel);return}
  if url.host=="127.0.0.1" && url.port==4317 || url.scheme=="about" {decisionHandler(.allow)}
  else {if navigationAction.navigationType == .linkActivated {NSWorkspace.shared.open(url)};decisionHandler(.cancel)}
 }
}
func startServer() async {

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
 await MainActor.run {
  if isReady {delegate.web.load(URLRequest(url:address))}
  else {let alert=NSAlert();alert.messageText="Agent Desk nije pokrenut.";alert.informativeText="Proveri data/server.log.";alert.runModal();NSApplication.shared.terminate(nil)}
 }
}
let delegate=MainActor.assumeIsolated { AppDelegate() }
NSApplication.shared.setActivationPolicy(.regular)
NSApplication.shared.delegate=delegate
NSApplication.shared.run()
