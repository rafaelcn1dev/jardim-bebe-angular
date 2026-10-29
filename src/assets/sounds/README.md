# Sons dos animais

Coloque aqui os arquivos de áudio de cada animal, usando exatamente estes nomes:

| Animal    | Arquivo esperado      |
|-----------|-----------------------|
| Gato      | `gato.mp3`            |
| Cachorro  | `cachorro.mp3`        |
| Galinha   | `galinha.mp3`         |
| Vaca      | `vaca.mp3`            |
| Sapo      | `sapo.mp3`            |
| Leão      | `leao.mp3`            |
| Elefante  | `elefante.mp3`        |
| Tigre     | `tigre.mp3`           |
| Arara     | `arara.mp3`           |

Se o arquivo de um animal não existir, o app volta automaticamente para o som
sintetizado (Web Audio API), então você pode ir adicionando os sons aos poucos.

## Som do gato (CC0)

`gato.mp3` pode ser o som "gata1.mp3" de essgglobal2016, licença Creative Commons 0:
https://freesound.org/people/essgglobal2016/sounds/333779/

Baixe o arquivo (requer login no Freesound), renomeie para `gato.mp3` e coloque
nesta pasta.

## Baixar um som por URL (script)

Em vez de baixar manualmente, use o script do projeto. Passe um link DIRETO
para um arquivo `.mp3` (de uma fonte livre) e o nome do animal:

```bash
npm run sound -- "https://url-direta-do-audio.mp3" gato
```

O arquivo é salvo automaticamente como `src/assets/sounds/<nome>.mp3`.

Fontes de áudio livres recomendadas (procure o botão de download direto `.mp3`):

- Pixabay: https://pixabay.com/sound-effects/
- Mixkit: https://mixkit.co/free-sound-effects/
- Freesound (muitos CC0): https://freesound.org/

> Não use links do YouTube nem áudio protegido por direitos autorais — o script
> recusa URLs do YouTube de propósito.

## Baixar pela página /baixar (interface visual)

Além da linha de comando, há uma página com formulário:

1. Em um terminal: `npm run sound-server` (deixe aberto — é o servidor que grava o arquivo).
2. Em outro terminal: `npm start`.
3. Abra `http://localhost:4200/#/baixar` (ou clique em "🎵 Baixar sons" no jardim).
4. Cole o link direto `.mp3` e o nome do animal, e clique em baixar.

O arquivo é gravado em `src/assets/sounds/<nome>.mp3`.

> A página só grava arquivos em desenvolvimento local, porque depende do
> servidor Node. No GitHub Pages (site estático) esse recurso fica indisponível
> — lá os sons são apenas os que já estão commitados na pasta.
