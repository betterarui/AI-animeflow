# logo-visual-test-report

## 渲染占比验证（DevTools 等效数据）
- 资源: `assets/images/logo/logo@1x.png`
- 图像尺寸: `360x68`
- 非透明包围盒: `359x64`
- 宽度占比: `99.72%`
- 高度占比: `94.12%`
- 结论: Logo 在可视区域占比 >= 70%，满足要求。

## 设备与缩放测试矩阵
| 场景 | 目标 | 结果 |
|---|---|---|
| 桌面 1920x1080 @100/125/150 | 检查过小问题 | 待执行（自动化环境阻塞） |
| iPhone SE / iPhone 13 | 检查头部可读性 | 待执行（自动化环境阻塞） |
| iPad | 检查中屏适配 | 待执行（自动化环境阻塞） |
| Android 1080p | 检查安卓渲染 | 待执行（自动化环境阻塞） |

## 自动化执行阻塞说明
- 已准备 Playwright 截图脚本: `scripts/take_logo_screenshots.py`
- 阻塞原因: 浏览器二进制下载超时 (`ECONNRESET` / `ETIMEDOUT`)
- 阻塞命令: `playwright install chromium`

## 建议补测步骤
1. 在可联网环境执行: `playwright install chromium`
2. 运行: `python scripts/take_logo_screenshots.py`
3. 检查输出目录: `frontend-demo/reports/screenshots/`
