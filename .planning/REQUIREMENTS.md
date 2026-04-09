# Requirements: GSS v1.1 细节打磨

## 终端体验

- [ ] **TERM-01**: 用户在终端区域右键可弹出上下文菜单，包含「复制」「粘贴」「清空」三项操作
- [ ] **TERM-02**: 「复制」仅在有选中文本时可用，无选中时置灰
- [ ] **TERM-03**: 亮色主题下终端背景切换为护眼色（米白/浅绿），前景色相应调整；暗色主题保持原 Catppuccin Mocha 配色不变
- [ ] **TERM-04**: 激活 tab 的背景色与当前终端主题背景色保持一致（亮色/暗色联动）

## 主机管理

- [ ] **HOST-01**: 用户点击删除主机按钮后，弹出确认对话框，需二次确认才执行删除
- [ ] **HOST-02**: 主机列表按 `groupName` 分组展示，每个分组可独立折叠/展开
- [ ] **HOST-03**: 无分组的主机归入「未分组」或直接平铺在分组列表末尾

## 交互反馈

- [ ] **UX-01**: 连接主机失败时，使用 Toast 通知替代原生 `alert()` 弹窗
- [ ] **UX-02**: 重连失败时，同样使用 Toast 通知
- [ ] **UX-03**: Tab 标签鼠标悬停时，显示 tooltip 包含完整主机名和 `user@host:port` 信息

## Future Requirements（延期）

- 严格主机密钥验证（Host Key Verification）
- 连接分组文件夹（嵌套分组）

## Out of Scope

- 终端字体大小调节——v1.1 不做，避免引入设置持久化复杂度
- 自动重连——需要后端心跳机制，超出打磨范围

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TERM-01 | Phase 4 | — |
| TERM-02 | Phase 4 | — |
| TERM-03 | Phase 4 | — |
| TERM-04 | Phase 4 | — |
| HOST-01 | Phase 5 | — |
| HOST-02 | Phase 5 | — |
| HOST-03 | Phase 5 | — |
| UX-01 | Phase 5 | — |
| UX-02 | Phase 5 | — |
| UX-03 | Phase 4 | — |
