# Pacman - Edição Arcade Retrô

Um clone do Pacman implementado em JavaScript puro (Vanilla JS), HTML5 Canvas e Web Audio API. O jogo inclui todas as mecânicas originais e expansões modernas: menu interativo com suporte a teclado e mouse, seleção de mapas e dificuldades, pastilhas especiais com modo vulnerável, personalidades de IA dos fantasmas, efeitos sonoros sintetizados nativos e persistência de recordes.

---

## 🎮 Estrutura do Projeto

```
Pacman/
├── index.html                  # Arquivo HTML principal e container arcade
├── style.css                   # Estilização visual retrô e renderização pixelada
├── audio.js                    # Sintetizador de efeitos sonoros 8-bit com Web Audio API
├── maps.js                     # Definições completas dos 4 mapas e temas
├── ghost.js                    # Classe Ghost: máquina de estados, personalidades de IA e sprites
├── pacman.js                   # Classe Pacman: movimentação, pastilhas especiais e teletransporte
├── game.js                     # Gerenciador de estados, menu interativo, game loop e HUD
├── assets/
│   ├── animations.gif          # Animação clássica da boca do Pacman
│   ├── ghost.png               # Spritesheet original dos 4 fantasmas
│   ├── ghosts_extended.png     # Spritesheet expandido com fantasmas extras, assustados e olhos
│   └── pacman.ico              # Ícone da aba do navegador
└── README.md                   # Documentação detalhada do projeto
```

---

## 🚀 Novidades e Melhorias Implementadas

### 1. Pastilhas Especiais (Power Pellets / Energizers)
- Pastilhas grandes e pulsantes posicionadas nos quatro cantos do labirinto (código `4` nas matrizes dos mapas).
- Ao devorar uma pastilha especial:
  - Os fantasmas entram em **Modo Vulnerável / Assustado** (ficam azuis e desaceleram).
  - Toca uma sirene contínua pulsante.
  - O Pacman pode devorar os fantasmas, recebendo bônus cumulativos de combo: **200 → 400 → 800 → 1600 pontos** com pontuação flutuante na tela!
  - Fantasmas devorados viram **apenas olhos** e retornam rapidamente para a base central para se regenerar.
  - Alerta visual piscando em branco e azul nos últimos 2,5 segundos antes do efeito acabar.

### 2. IA dos Fantasmas, Dificuldades e Novos Fantasmas
- **Máquina de 4 Estados**:
  - `CHASE`: Perseguição ativa conforme a personalidade.
  - `SCATTER`: Dispersão periódica para os cantos da arena (dá respiro ao jogador).
  - `FRIGHTENED`: Fuga e movimentos aleatórios enquanto azuis.
  - `EATEN`: Retorno em alta velocidade para a casa central.
- **Personalidades Clássicas de IA**:
  - **Blinky (Vermelho)**: O Perseguidor direto, caça o Pacman incansavelmente.
  - **Pinky (Rosa)**: O Emboscador, tenta antecipar 4 blocos à frente da direção do Pacman.
  - **Inky (Ciano)**: O Flanqueador imprevisível, combina as posições de Blinky e Pacman.
  - **Clyde (Laranja)**: O Covarde, persegue quando longe (> 8 blocos) e foge para o canto quando perto.
  - **Sue (Roxo)**: Patrulheira de flanco, ativa no modo Difícil.
  - **Funky (Verde)**: Rápido e caótico, ativo no modo Pesadelo.
- **Níveis de Dificuldade Selecionáveis**:
  - **Fácil**: 3 fantasmas, velocidade 45%, pastilha dura 10s.
  - **Normal**: 4 fantasmas clássicos, velocidade 65%, pastilha dura 7s.
  - **Difícil**: 5 fantasmas (com Sue/Roxo), velocidade 82%, pastilha dura 4.5s.
  - **Pesadelo**: 6 fantasmas (com Funky/Verde), velocidade 95%, pastilha dura 3s.

### 3. Múltiplos Mapas & Menu Inicial Arcade
- **Menu Inicial Interativo**:
  - Navegável por **Teclado (Setas / WASD / Enter)** ou por **Cliques do Mouse**.
  - **Mini-Preview em tempo real**: Exibe um minimapa vivo do mapa selecionado.
  - Opções: Iniciar Jogo, Selecionar Mapa, Selecionar Dificuldade, Alternar Áudio, Ver Recordes e Como Jogar.
- **4 Mapas Únicos**:
  - **Clássico**: O labirinto tradicional com 4 pastilhas especiais e túneis laterais.
  - **A Arena**: Centro amplo com anéis concêntricos de alta velocidade.
  - **Túneis Extremos**: Múltiplos atalhos de teletransporte horizontais e verticais.
  - **Labirinto Duplo**: Dois núcleos espelhados com curvas fechadas para jogadores experientes.

### 4. Áudio 8-bit Nativo (Web Audio API)
- 100% sintetizado em tempo real pelo navegador, sem downloads de MP3/WAV:
  - Waka-waka ao comer pastilhas normais.
  - Sirene oscilante de pastilha especial ativa.
  - Arpeggio ao devorar um fantasma.
  - Efeito descendente de morte do Pacman.
  - Fanfarra ao vencer o mapa.
  - Bips de navegação no menu.
- **Silenciador**: Tecla `M` ou opção no menu inicial para ligar/desligar o áudio.

### 5. Teletransporte em Túneis (Wrap-around)
- Travessia suave de borda a borda: sair pela esquerda transporta o Pacman e os fantasmas para a direita (e vice-versa), além de suporte a túneis verticais.

### 6. Tabela de Recordes (High Scores)
- Pontuações salvas automaticamente no `localStorage` por mapa e dificuldade.

---

## 🕹️ Controles

| Ação | Teclas | Mouse |
| :--- | :--- | :--- |
| **Mover Pacman** | `←` `↑` `→` `↓` ou `W` `A` `S` `D` | - |
| **Navegar Menus** | `↑` `↓` / `W` `S` (seleção), `←` `→` / `A` `D` (ciclar opções) | Passar o cursor e clicar |
| **Confirmar / Jogar** | `Enter` ou `Espaço` | Clique direto no botão |
| **Pausar / Despausar** | `P` ou `ESC` | - |
| **Silenciar / Ativar Áudio** | `M` | Clicar na opção de áudio no menu |
| **Reiniciar Partida** | `R` (na tela de pausa) | - |
| **Voltar ao Menu** | `Q` ou `ESC` | Clicar para voltar |

---

## 📦 Como Executar

1. Clone ou baixe este repositório:
   ```bash
   git clone https://github.com/FelipeFMedeiros/Pacman.git
   ```
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).
3. Não requer instalação de pacotes, compilação ou servidores Node.js!

## 🎮 Também disponível:  
O projeto também está diponível via [GitHub Pages](https://felipefmedeiros.github.io/Pacman/). Acesse e jogue!