import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

export function createRestartManager({
  dataDir,
  getChats = () => [],
  getRunning = () => new Map(),
  shutdown = () => {},
  execute = null
} = {}) {
  const bootId = randomUUID();
  const bootTime = Date.now();
  const restartInfoFile = path.join(dataDir, 'restart-info.json');

  let lastRestart = null;
  if (fs.existsSync(restartInfoFile)) {
    try {
      lastRestart = JSON.parse(fs.readFileSync(restartInfoFile, 'utf8'));
      fs.unlinkSync(restartInfoFile);
    } catch (e) {
      console.error('Restart info čitanje:', e.message);
    }
  }

  let scheduledRestart = null;

  function defaultExecute(info) {
    if (info) {
      try {
        fs.writeFileSync(restartInfoFile, JSON.stringify(info), { mode: 0o600 });
      } catch (e) {
        console.error('Pisanje restart-info:', e.message);
      }
    }
    try {
      shutdown();
    } catch (e) {
      console.error('Shutdown greška:', e.message);
    }
    setTimeout(() => {
      if (process.platform === 'darwin') {
        const uid = process.getuid ? process.getuid() : 501;
        const child = spawn('launchctl', ['kickstart', '-k', `gui/${uid}/local.agent-desk.server`], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      }
      setTimeout(() => process.exit(0), 100).unref();
    }, 300).unref();
  }

  let runRestart = execute || defaultExecute;

  function status() {
    return {
      bootId,
      bootTime,
      restartedBy: lastRestart?.requesterTitle || null,
      scheduled: !!scheduledRestart,
      scheduledRestart: scheduledRestart ? { ...scheduledRestart } : null
    };
  }

  function otherRunningChats(chatId) {
    const running = getRunning();
    return getChats().filter(c => running.has(c.id) && c.id !== chatId);
  }

  function requester(chat) {
    const reply=chat?.messages?.at(-1);
    return chat && reply?.role==='assistant' ? {chatId:chat.id,messageId:reply.id,agent:reply.agent || chat.settings?.agent} : null;
  }

  function request({ chatId, whenIdle = false } = {}) {
    const callerChat = chatId ? getChats().find(c => c.id === chatId) : null;
    const waiting=[...(scheduledRestart?.requesters || [])];
    const caller=requester(callerChat);
    const joined=caller && !waiting.some(r=>r.chatId===caller.chatId && r.messageId===caller.messageId);
    if(joined)waiting.push(caller);
    const others = otherRunningChats(chatId);
    const otherTitles = others.map(c => c.title);

    if (others.length > 0) {
      if (whenIdle) {
        if (scheduledRestart) {
          scheduledRestart.requesters=waiting;
          if(joined)return {status:200,body:{ok:true,scheduled:true,scheduledRestart:{...scheduledRestart},message:'Čet je dodat za nastavak posle zakazanog restarta.'}};
          return {
            status: 409,
            body: {
              error: 'Restart je već zakazan.',
              scheduled: true,
              scheduledRestart: { ...scheduledRestart }
            }
          };
        }
        scheduledRestart = {
          chatId: chatId || null,
          chatTitle: callerChat?.title || null,
          requestedAt: Date.now(),
          requesters: waiting
        };
        return {
          status: 200,
          body: {
            ok: true,
            scheduled: true,
            running: otherTitles,
            runningChats: otherTitles,
            chatTitles: otherTitles,
            scheduledRestart: { ...scheduledRestart },
            message: 'Restart je zakazan čim ostali agenti završe.'
          }
        };
      }
      return {
        status: 409,
        body: {
          error: 'Drugi agenti rade.',
          running: otherTitles,
          runningChats: otherTitles,
          chatTitles: otherTitles
        }
      };
    }

    const restartPayload = {
      requesterChatId: chatId || null,
      requesterTitle: callerChat?.title || null,
      requestedAt: Date.now(),
      requesters: waiting
    };
    scheduledRestart = null;

    setTimeout(() => {
      runRestart(restartPayload);
    }, 100);

    return {
      status: 200,
      body: {
        ok: true,
        restarting: true,
        message: 'Server se restartuje. Restart prekida i tvoj odgovor.'
      }
    };
  }

  function checkScheduled() {
    if (!scheduledRestart) return false;
    const others = otherRunningChats(scheduledRestart.chatId);
    if (others.length === 0) {
      const restartPayload = {
        requesterChatId: scheduledRestart.chatId,
        requesterTitle: scheduledRestart.chatTitle,
        requesters: scheduledRestart.requesters || [],
        requestedAt: scheduledRestart.requestedAt
      };
      scheduledRestart = null;
      setTimeout(() => {
        runRestart(restartPayload);
      }, 100);
      return true;
    }
    return false;
  }

  return {
    bootId,
    bootTime,
    lastRestart,
    getScheduled: () => scheduledRestart,
    status,
    request,
    checkScheduled,
    setExecutor: fn => { runRestart = fn; }
  };
}
