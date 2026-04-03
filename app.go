package main

import (
	"context"

	"gss/internal/store"
)

type App struct {
	ctx context.Context
	db  *store.DB
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	db, err := store.New()
	if err != nil {
		panic(err)
	}
	a.db = db
}

func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}

// ListHosts 返回所有主机配置（Secret 字段不返回给前端）
func (a *App) ListHosts() ([]*store.Host, error) {
	hosts, err := a.db.ListHosts()
	if err != nil {
		return nil, err
	}
	// 不暴露加密后的 Secret 字段给前端
	for _, h := range hosts {
		h.Secret = nil
	}
	return hosts, nil
}

// CreateHost 创建主机配置
func (a *App) CreateHost(h *store.Host) error {
	return a.db.CreateHost(h)
}

// UpdateHost 更新主机配置
func (a *App) UpdateHost(h *store.Host) error {
	return a.db.UpdateHost(h)
}

// DeleteHost 删除主机配置
func (a *App) DeleteHost(id string) error {
	return a.db.DeleteHost(id)
}
