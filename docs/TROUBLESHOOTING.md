# AnimeFlow 错误排查文档

> 维护规则：本文档只记录排查方法、现象、原因和处理步骤，不记录 API Key、Cloudflare 凭证、账号密码、邀请码等敏感信息。

## Cloudflare Error 1033：Cloudflare Tunnel error

### 现象

公网用户访问以下域名时，偶尔看到 Cloudflare 错误页：

```text
https://animeflow.cn
https://www.animeflow.cn
```

错误页关键信息：

```text
Error 1033
Cloudflare Tunnel error
The host is configured as a Cloudflare Tunnel, and Cloudflare is currently unable to resolve it.
```

本次用户截图中的时间为：

```text
2026-05-15 09:34:50 UTC
北京时间：2026-05-15 17:34:50
```

### 结论

这不是 Next.js 页面报错，也不是应用业务代码抛出的异常。

`Error 1033` 发生在 Cloudflare Tunnel 层：域名已经指向 Cloudflare Tunnel，但 Cloudflare 当时没有找到健康可用的 tunnel connector，所以公网请求无法转发到本机 `127.0.0.1:3000`。

换句话说，公网链路断在这里：

```text
用户浏览器
  -> Cloudflare
  -> Cloudflare Tunnel 连接不可用
  -> 本机 Next.js 服务没有被访问到
```

### 当前部署链路

```text
https://animeflow.cn
https://www.animeflow.cn
        ↓
Cloudflare DNS / HTTPS
        ↓
Cloudflare named tunnel: animeflow
        ↓
C:\ProgramData\cloudflared\cloudflared.exe
        ↓
http://127.0.0.1:3000
        ↓
Next.js production server
```

关键配置：

```text
Tunnel name: animeflow
Tunnel ID: d4fcd5b7-303b-4400-b234-f691c33e1445
Tunnel config: C:\ProgramData\cloudflared\config.yml
Tunnel protocol: http2
Local service: http://127.0.0.1:3000
```

### 本次排查证据

当 tunnel 恢复后，执行：

```powershell
C:\ProgramData\cloudflared\cloudflared.exe tunnel info animeflow
```

可看到 tunnel 已重新注册连接：

```text
EDGE: 2xlax01, 1xlax07, 1xlax11
protocol=http2
```

但 `.tunnel/cloudflared-named.err.log` 中出现过以下错误：

```text
Failed to refresh feature selector error="lookup cfd-features.argotunnel.com: dnsquery: No DNS servers configured for local system."
Failed to refresh DNS local resolver error="lookup region1.v2.argotunnel.com: i/o timeout"
Unable to establish connection with Cloudflare edge error="DialContext error: dial tcp ... connectex: A socket operation was attempted to an unreachable network."
Unable to establish connection with Cloudflare edge error="DialContext error: dial tcp ... connectex: A socket operation was attempted to an unreachable host."
Connection terminated error="DialContext error: dial tcp ..."
```

这些日志说明：`cloudflared` 在某些时段无法从本机连到 Cloudflare edge，随后自动重试，恢复后重新注册 tunnel connection。

### 常见原因

- 本机电脑睡眠、关机或重启。
- 本机网络短暂断开，或者运营商网络到 Cloudflare edge 抖动。
- Windows 当前用户未登录，当前计划任务是 `Interactive only`，不是系统级常驻服务。
- 本机 DNS 临时异常，导致 `region1.v2.argotunnel.com` 或 `cfd-features.argotunnel.com` 查询超时。
- `cloudflared` 进程被关闭、崩溃或被安全软件拦截。
- 本机 Next.js 服务没有运行时，通常更容易表现为 502/源站不可达；但如果 tunnel 自身也断了，就会表现为 1033。

### 立即排查命令

在本机 PowerShell 执行：

```powershell
Get-Process | Where-Object { $_.ProcessName -like "*cloudflared*" } | Select-Object Id,ProcessName,StartTime,Path
```

检查 tunnel 状态：

```powershell
C:\ProgramData\cloudflared\cloudflared.exe tunnel list
C:\ProgramData\cloudflared\cloudflared.exe tunnel info animeflow
```

检查 tunnel 配置：

```powershell
Get-Content C:\ProgramData\cloudflared\config.yml
```

检查本机 Next.js 是否监听：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
```

检查本机网站：

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000 -UseBasicParsing -TimeoutSec 20
```

检查公网域名：

```powershell
Invoke-WebRequest -Uri https://animeflow.cn -UseBasicParsing -TimeoutSec 30
Invoke-WebRequest -Uri https://www.animeflow.cn -UseBasicParsing -TimeoutSec 30
```

查看最近 tunnel 日志：

```powershell
Get-Content -Tail 120 D:\AMJ\animeflow\.tunnel\cloudflared-named.err.log
```

查看计划任务：

```powershell
schtasks /Query /TN "AnimeFlow Cloudflare Tunnel" /FO LIST
schtasks /Query /TN "AnimeFlow Ensure Local App" /FO LIST
```

如果 `Logon Mode` 显示 `Interactive only`，说明任务依赖当前 Windows 用户登录。电脑重启后如果没有登录桌面，服务可能不会自动恢复。

### 临时恢复方法

如果 tunnel 进程不存在，手动启动：

```powershell
schtasks /Run /TN "AnimeFlow Cloudflare Tunnel"
```

如果 Next.js 本机服务不存在，手动启动：

```powershell
schtasks /Run /TN "AnimeFlow Ensure Local App"
```

或者直接运行：

```powershell
cd D:\AMJ\animeflow
npm.cmd run start -- -H 127.0.0.1 -p 3000
```

如果 DNS 查询异常，可临时检查本机网络和 DNS：

```powershell
Resolve-DnsName region1.v2.argotunnel.com
Resolve-DnsName cfd-features.argotunnel.com
Test-NetConnection 198.41.200.23 -Port 7844
```

### 长期修复建议

1. 将 `cloudflared` 从当前用户计划任务升级为 Windows 系统级服务或 SYSTEM 计划任务。
2. 将 Next.js 本机服务也升级为 SYSTEM 级计划任务，避免依赖当前用户登录。
3. Windows 电源设置改为不睡眠，网络适配器禁止节能断开。
4. 优先使用有线网络，降低 Wi-Fi 抖动对 tunnel 的影响。
5. 定期更新 `cloudflared`，本次排查时当前版本为 `2026.3.0`，命令提示已有 `2026.5.0` 可用。
6. 如果需要商业级稳定性，建议迁移到云服务器或至少准备第二台机器作为备用 tunnel connector。
7. Cloudflare Tunnel 支持多个 connector。条件允许时，可在另一台常在线机器上运行同一个 tunnel，降低单机断网导致的 1033 风险。

### 本次已实施的修复

- `\.tools/ensure-cloudflared.ps1` 已从“只看进程是否存在”升级为“先做 tunnel 健康检查，再决定是否重启”。
- 现在会通过 `cloudflared tunnel info animeflow` 判断是否真的存在活动 connector，避免出现“进程还在但连接已经断了”的漏报。
- 同时修复了之前误判为无进程而重复拉起 connector 的问题，避免 tunnel 连接数被错误放大。
- `\.tools/ensure-animeflow.ps1` 也改为页面健康检查，不再只看 `127.0.0.1:3000` 端口是否监听。
- 当前的计划任务仍是 `Interactive only`，所以如果电脑重启后没有登录 Windows 用户，还是需要后续再升级为系统级常驻方式。

### 和其他错误的区别

```text
1033：Cloudflare 找不到健康 tunnel connector，通常是 cloudflared 或本机网络问题。
502/503：Tunnel 可能还在，但本机 127.0.0.1:3000 服务不可用或响应失败。
401：应用登录保护生效，不是故障。
404：路径不存在，或 tunnel ingress 最后一条 http_status:404 命中。
```

### 官方参考

- Cloudflare Error 1033: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/
- Cloudflare Tunnel local management: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/local-management/create-local-tunnel/
- Cloudflare Tunnel Windows service: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/as-a-service/windows/
