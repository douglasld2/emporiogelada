#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monitor de Internet com interface gráfica e ícone na bandeja do Windows.
Recursos:
- Ping periódico em background.
- Registro de disponibilidade e latência.
- Gráfico ao vivo da disponibilidade recente.
- Relatórios de disponibilidade.
- Ícone na bandeja do sistema (system tray).
"""

import subprocess
import threading
import time
import csv
import os
import sys
import re
from datetime import datetime, timedelta
from collections import deque
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import pystray
from PIL import Image, ImageDraw  # necessário para criar ícone
import signal

# ==================== CONFIGURAÇÕES ====================
DEFAULT_HOST = "1.1.1.1"
PING_INTERVAL = 5  # segundos
MAX_LOG_ENTRIES = 1000000000  # máximo de entradas mantidas na memória para gráfico
LOG_FILE = "ping_log.csv"
REPORT_FILE = "relatorio.txt"
HISTORY_MINUTES = 60  # minutos mostrados no gráfico (rolagem)

# ==================== MONITOR DE INTERNET (BACKGROUND) ====================
class InternetMonitor:
    def __init__(self, host=DEFAULT_HOST, interval=PING_INTERVAL):
        self.host = host
        self.interval = interval
        self.running = False
        self.thread = None
        self.data = deque(maxlen=MAX_LOG_ENTRIES)  # cada item: (timestamp, sucesso, latencia)
        self.lock = threading.Lock()
        self.callback = None  # função chamada a cada novo resultado

    def ping(self):
        """Retorna (sucesso, latência_ms, erro_msg)"""
        try:
            cmd = ['ping', '-n', '1', '-w', '1000', self.host]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            if result.returncode == 0:
                output = result.stdout
                # Extrai latência (ex: "tempo=25ms" ou "Tempo = 25ms")
                match = re.search(r'tempo[=:]\s*(\d+)', output, re.IGNORECASE)
                if match:
                    latency = int(match.group(1))
                    return True, latency, None
                return True, None, None
            else:
                return False, None, "Falha no ping (timeout ou host inacessível)"
        except subprocess.TimeoutExpired:
            return False, None, "Timeout ao executar ping"
        except Exception as e:
            return False, None, str(e)

    def _worker(self):
        while self.running:
            timestamp = datetime.now()
            sucesso, latencia, erro = self.ping()
            with self.lock:
                self.data.append((timestamp, sucesso, latencia))
            # Salva no CSV
            self._log_to_csv(timestamp, sucesso, latencia, erro if erro else "")
            # Chama callback se existir
            if self.callback:
                self.callback(timestamp, sucesso, latencia)
            time.sleep(self.interval)

    def start(self, callback=None):
        if self.running:
            return
        self.running = True
        self.callback = callback
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)

    def _log_to_csv(self, timestamp, sucesso, latencia, erro):
        file_exists = os.path.isfile(LOG_FILE)
        with open(LOG_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['timestamp', 'sucesso', 'latencia_ms', 'erro'])
            writer.writerow([timestamp.isoformat(), sucesso, latencia if latencia is not None else '', erro])

    def get_stats(self):
        """Retorna dicionário com estatísticas baseadas nos dados em memória."""
        with self.lock:
            if not self.data:
                return {'total': 0, 'sucessos': 0, 'falhas': 0, 'disponibilidade': 0.0,
                        'media_latencia': None, 'min_latencia': None, 'max_latencia': None}
            total = len(self.data)
            sucessos = sum(1 for _, s, _ in self.data if s)
            falhas = total - sucessos
            disponibilidade = (sucessos / total) * 100 if total > 0 else 0.0
            latencias = [lat for _, s, lat in self.data if s and lat is not None]
            media = sum(latencias) / len(latencias) if latencias else None
            min_lat = min(latencias) if latencias else None
            max_lat = max(latencias) if latencias else None
            return {
                'total': total,
                'sucessos': sucessos,
                'falhas': falhas,
                'disponibilidade': disponibilidade,
                'media_latencia': media,
                'min_latencia': min_lat,
                'max_latencia': max_lat
            }

    def get_history_for_graph(self, minutes=HISTORY_MINUTES):
        """Retorna listas de timestamps e valores de sucesso (1/0) para o período especificado."""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        with self.lock:
            filtered = [(ts, 1 if sucesso else 0) for ts, sucesso, _ in self.data if ts >= cutoff]
        if not filtered:
            return [], []
        # Ordenar por timestamp
        filtered.sort(key=lambda x: x[0])
        timestamps = [x[0] for x in filtered]
        values = [x[1] for x in filtered]
        return timestamps, values

    def generate_report(self):
        """Gera relatório completo usando dados do CSV (para garantir histórico completo)."""
        if not os.path.exists(LOG_FILE):
            return "Arquivo de log não encontrado."
        total = 0
        sucessos = 0
        latencias = []
        primeiro = None
        ultimo = None
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            try:
                next(reader)  # cabeçalho
            except StopIteration:
                return "Log vazio."
            for row in reader:
                if len(row) < 2:
                    continue
                total += 1
                ts_str = row[0]
                sucesso = row[1].lower() == 'true'
                if sucesso:
                    sucessos += 1
                    if len(row) > 2 and row[2]:
                        try:
                            latencias.append(float(row[2]))
                        except:
                            pass
                try:
                    ts = datetime.fromisoformat(ts_str)
                    if primeiro is None or ts < primeiro:
                        primeiro = ts
                    if ultimo is None or ts > ultimo:
                        ultimo = ts
                except:
                    pass
        if total == 0:
            return "Nenhum dado registrado."
        disponibilidade = (sucessos / total) * 100
        media_lat = sum(latencias) / len(latencias) if latencias else None
        min_lat = min(latencias) if latencias else None
        max_lat = max(latencias) if latencias else None

        relatorio = f"""
============================================================
RELATÓRIO DE DISPONIBILIDADE DE INTERNET
Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
============================================================

Período analisado:
  Início: {primeiro.strftime('%Y-%m-%d %H:%M:%S') if primeiro else 'N/A'}
  Fim:    {ultimo.strftime('%Y-%m-%d %H:%M:%S') if ultimo else 'N/A'}

Total de verificações: {total}
Sucessos (conectado):  {sucessos}
Falhas:                {total - sucessos}
Disponibilidade:       {disponibilidade:.2f}%
Latência média (ms):   {media_lat:.2f if media_lat else 'N/A'}
Latência mínima (ms):  {min_lat:.2f if min_lat else 'N/A'}
Latência máxima (ms):  {max_lat:.2f if max_lat else 'N/A'}

============================================================
"""
        with open(REPORT_FILE, 'w', encoding='utf-8') as f:
            f.write(relatorio)
        return relatorio

# ==================== INTERFACE GRÁFICA ====================
class MonitorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Monitor de Internet")
        self.root.geometry("800x600")
        self.root.protocol("WM_DELETE_WINDOW", self.hide_window)  # minimizar para bandeja
        self.monitor = InternetMonitor()
        self.graph_update_interval = 1000  # ms
        self.after_id = None

        # Criação dos widgets
        self.create_widgets()
        self.update_stats()
        self.start_graph_updates()

        # Inicia o monitor automaticamente
        self.monitor.start(callback=self.on_ping_result)

        # Configura ícone na bandeja
        self.setup_tray()

    def create_widgets(self):
        # Frame superior com estatísticas
        stats_frame = ttk.LabelFrame(self.root, text="Estatísticas", padding=10)
        stats_frame.pack(fill="x", padx=10, pady=5)

        self.stats_vars = {
            'total': tk.StringVar(value="Total: 0"),
            'sucessos': tk.StringVar(value="Sucessos: 0"),
            'falhas': tk.StringVar(value="Falhas: 0"),
            'disp': tk.StringVar(value="Disponibilidade: 0.00%"),
            'latencia': tk.StringVar(value="Latência média: -- ms")
        }
        for i, (key, var) in enumerate(self.stats_vars.items()):
            label = ttk.Label(stats_frame, textvariable=var, font=("Arial", 10))
            label.grid(row=0, column=i, padx=10, sticky="w")

        # Frame do gráfico
        graph_frame = ttk.LabelFrame(self.root, text="Disponibilidade (últimos {} minutos)".format(HISTORY_MINUTES), padding=5)
        graph_frame.pack(fill="both", expand=True, padx=10, pady=5)

        self.fig = Figure(figsize=(6, 3), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.ax.set_ylim(-0.1, 1.1)
        self.ax.set_yticks([0, 1])
        self.ax.set_yticklabels(['Falha', 'Sucesso'])
        self.ax.set_xlabel("Tempo")
        self.ax.set_title("Histórico de conectividade")
        self.canvas = FigureCanvasTkAgg(self.fig, master=graph_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)

        # Frame de botões
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(fill="x", padx=10, pady=10)

        ttk.Button(btn_frame, text="Gerar Relatório", command=self.gerar_relatorio).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Exportar CSV", command=self.exportar_csv).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Limpar Log", command=self.limpar_log).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Sair", command=self.sair_app).pack(side="right", padx=5)

        # Status bar
        self.status_var = tk.StringVar(value="Monitor ativo - Pingando a cada {}s para {}".format(PING_INTERVAL, DEFAULT_HOST))
        status_bar = ttk.Label(self.root, textvariable=self.status_var, relief="sunken", anchor="w")
        status_bar.pack(side="bottom", fill="x")

    def on_ping_result(self, timestamp, sucesso, latencia):
        """Callback chamado a cada novo ping. Atualiza estatísticas na GUI."""
        # Atualiza estatísticas periodicamente (a cada ping)
        self.update_stats()
        # O gráfico é atualizado separadamente a cada segundo

    def update_stats(self):
        stats = self.monitor.get_stats()
        self.stats_vars['total'].set(f"Total: {stats['total']}")
        self.stats_vars['sucessos'].set(f"Sucessos: {stats['sucessos']}")
        self.stats_vars['falhas'].set(f"Falhas: {stats['falhas']}")
        self.stats_vars['disp'].set(f"Disponibilidade: {stats['disponibilidade']:.2f}%")
        if stats['media_latencia'] is not None:
            self.stats_vars['latencia'].set(f"Latência média: {stats['media_latencia']:.1f} ms")
        else:
            self.stats_vars['latencia'].set("Latência média: -- ms")

    def update_graph(self):
        """Atualiza o gráfico com os últimos dados."""
        timestamps, values = self.monitor.get_history_for_graph(minutes=HISTORY_MINUTES)
        if not timestamps:
            self.ax.clear()
            self.ax.set_ylim(-0.1, 1.1)
            self.ax.set_yticks([0, 1])
            self.ax.set_yticklabels(['Falha', 'Sucesso'])
            self.ax.set_title("Aguardando dados...")
            self.canvas.draw()
            return

        self.ax.clear()
        self.ax.plot(timestamps, values, drawstyle="steps-post", linewidth=1, color='blue')
        self.ax.set_ylim(-0.1, 1.1)
        self.ax.set_yticks([0, 1])
        self.ax.set_yticklabels(['Falha', 'Sucesso'])
        self.ax.set_xlabel("Hora")
        self.ax.set_title("Histórico de conectividade (últimos {} min)".format(HISTORY_MINUTES))
        self.fig.autofmt_xdate()  # rotaciona datas
        self.canvas.draw()

    def start_graph_updates(self):
        self.update_graph()
        self.after_id = self.root.after(self.graph_update_interval, self.start_graph_updates)

    def gerar_relatorio(self):
        relatorio = self.monitor.generate_report()
        if relatorio.startswith("Arquivo") or relatorio.startswith("Nenhum"):
            messagebox.showinfo("Relatório", relatorio)
        else:
            # Mostra caixa com local do arquivo
            messagebox.showinfo("Relatório", f"Relatório salvo em {REPORT_FILE}\n\n{relatorio}")

    def exportar_csv(self):
        if not os.path.exists(LOG_FILE):
            messagebox.showerror("Erro", "Nenhum log encontrado para exportar.")
            return
        destino = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV files", "*.csv")])
        if destino:
            import shutil
            shutil.copy(LOG_FILE, destino)
            messagebox.showinfo("Exportar", f"Log exportado para {destino}")

    def limpar_log(self):
        if messagebox.askyesno("Limpar Log", "Tem certeza que deseja limpar todo o histórico? Isso reiniciará as estatísticas."):
            # Para o monitor temporariamente
            self.monitor.stop()
            # Limpa arquivo e dados em memória
            if os.path.exists(LOG_FILE):
                os.remove(LOG_FILE)
            with self.monitor.lock:
                self.monitor.data.clear()
            # Reinicia monitor
            self.monitor.start(callback=self.on_ping_result)
            self.update_stats()
            self.update_graph()
            messagebox.showinfo("Limpar Log", "Log limpo com sucesso.")

    def hide_window(self):
        """Minimiza para a bandeja ao invés de fechar."""
        self.root.withdraw()

    def show_window(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def sair_app(self):
        if messagebox.askokcancel("Sair", "Deseja realmente sair? O monitor será encerrado."):
            self.monitor.stop()
            if self.after_id:
                self.root.after_cancel(self.after_id)
            self.root.quit()
            self.root.destroy()
            # Para o ícone da bandeja
            if hasattr(self, 'icon'):
                self.icon.stop()

    def setup_tray(self):
        # Cria um ícone simples (pode ser substituído por um arquivo .ico)
        image = Image.new('RGB', (64, 64), color='blue')
        draw = ImageDraw.Draw(image)
        draw.rectangle((16, 16, 48, 48), fill='white')
        draw.ellipse((24, 24, 40, 40), fill='green')

        menu = pystray.Menu(
            pystray.MenuItem("Mostrar Janela", self.show_window),
            pystray.MenuItem("Gerar Relatório", self.gerar_relatorio),
            pystray.MenuItem("Sair", self.sair_app)
        )
        self.icon = pystray.Icon("monitor_internet", image, "Monitor de Internet", menu)
        # Executa a bandeja em thread separada
        threading.Thread(target=self.icon.run, daemon=True).start()

# ==================== MAIN ====================
if __name__ == "__main__":
    root = tk.Tk()
    app = MonitorApp(root)
    root.mainloop()