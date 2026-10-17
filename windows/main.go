// Mom Academy - a small offline desktop app.
// It serves the planner from inside the .exe on this computer only (127.0.0.1),
// opens it in its own Microsoft Edge or Chrome app window, and saves progress
// to %APPDATA%\MomAcademy\progress.json so nothing is lost if browser data is cleared.
package main

import (
	"embed"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

//go:embed web/*
var webFiles embed.FS

const addr = "127.0.0.1:47812"

var (
	lastPing atomic.Int64
	fileMu   sync.Mutex
)

func dataDir() string {
	base := os.Getenv("APPDATA")
	if base == "" {
		base, _ = os.UserHomeDir()
	}
	d := filepath.Join(base, "MomAcademy")
	os.MkdirAll(d, 0o755)
	// Bring over progress from the earlier "Our Preschool Year" version.
	newFile := filepath.Join(d, "progress.json")
	if _, err := os.Stat(newFile); err != nil {
		if b, err := os.ReadFile(filepath.Join(base, "OurPreschoolYear", "progress.json")); err == nil {
			os.WriteFile(newFile, b, 0o644)
		}
	}
	return d
}

func main() {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		// Already running: just open another window.
		openWindow()
		return
	}
	stateFile := filepath.Join(dataDir(), "progress.json")
	lastPing.Store(time.Now().Unix())

	sub, _ := fs.Sub(webFiles, "web")
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(sub)))
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		lastPing.Store(time.Now().Unix())
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/api/state", func(w http.ResponseWriter, r *http.Request) {
		fileMu.Lock()
		defer fileMu.Unlock()
		switch r.Method {
		case http.MethodGet:
			b, err := os.ReadFile(stateFile)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "no-store")
			w.Write(b)
		case http.MethodPut:
			b, err := io.ReadAll(io.LimitReader(r.Body, 5<<20))
			if err != nil || len(b) == 0 {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			if old, err := os.ReadFile(stateFile); err == nil {
				os.WriteFile(stateFile+".bak", old, 0o644)
			}
			tmp := stateFile + ".tmp"
			if err := os.WriteFile(tmp, b, 0o644); err != nil {
				http.Error(w, "could not save", http.StatusInternalServerError)
				return
			}
			os.Rename(tmp, stateFile)
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Quit a few minutes after the app window is closed (no more pings).
	go func() {
		for {
			time.Sleep(30 * time.Second)
			if time.Now().Unix()-lastPing.Load() > 180 {
				os.Exit(0)
			}
		}
	}()
	go func() {
		time.Sleep(300 * time.Millisecond)
		openWindow()
	}()
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	srv.Serve(ln)
}

func openWindow() {
	url := "http://" + addr + "/"
	if runtime.GOOS != "windows" {
		exec.Command("xdg-open", url).Start()
		return
	}
	pf := os.Getenv("ProgramFiles")
	pf86 := os.Getenv("ProgramFiles(x86)")
	local := os.Getenv("LOCALAPPDATA")
	candidates := []string{
		filepath.Join(pf86, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(pf86, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(local, `Google\Chrome\Application\chrome.exe`),
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			if exec.Command(c, "--app="+url, "--window-size=1100,860").Start() == nil {
				return
			}
		}
	}
	exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
