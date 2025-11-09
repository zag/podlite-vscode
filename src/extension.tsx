import * as vscode from 'vscode'
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server'
import * as ReactDOM from 'react-dom';
import * as ReactDOMServer from 'react-dom/server';
import Podlite from '@podlite/to-jsx'
import { MathJaxProvider } from '@podlite/formula'
import * as path from 'path'
import * as fs from 'fs'

// declare global {
//     var document: any;
//   }

function templateEngine(template: string, data: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match: string, key: string): string => {
    const value = data[key]
    if (typeof value === 'object' && value !== null) {
      // Convert object to a list of strings
      const objectStrings = Object.entries(value).map(
        ([k, v]) =>
          `  =begin item
  B<${k}>
  
  ${v}
  =end item`,
      )
      return `${objectStrings.join('\n')}`
    }
    return typeof data[key] !== 'undefined' ? data[key] : match
  })
}

export function activate(context: vscode.ExtensionContext) {
  class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>()
    public lastPreviewHTML = ''
    private lastPreviewUri = ''
    public needsRebuild = true
    public current_line = 0

    constructor(private readonly previewUri: vscode.Uri) {
      const refreshInterval = 1000; //vscode.workspace.getConfiguration('Podlite').get('runInterval', 1000)

      /* Setup a timer to check if the preview should be rebuilt */
      var timer = setInterval(
        () => {
          if (this.needsRebuild) {
            this.update(previewUri)
          }
        },
        // The periodicity of the timer.
        refreshInterval,
      )
    }

    /*
          Called by vscode when the content needs to be rendered
        */
    public provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
      if (!vscode.window.activeTextEditor || !this.needsRebuild) {
        return this.lastPreviewHTML
      } else {
        this.needsRebuild = false
        return this.createHtml()
      }
    }

    /* Called when the content changes */
    get onDidChange(): vscode.Event<vscode.Uri> {
      return this._onDidChange.event
    }

    /* Trigger content update */
    public update(uri: vscode.Uri) {
      this._onDidChange.fire(uri)
    }

    public active_update(uri: vscode.Uri) {
      this.createHtml()
    }

    /* Builds the content from the active text editor window */
    public async createHtml() {
      const editor = vscode.window.activeTextEditor
      //   const text = editor!.document.getText()
      //   const ext_path = vscode.extensions.getExtension('podlite.podlite-vscode').extensionPath;

      var p = new Promise<string>(async resolve => {
        var line = this.current_line
        var html = ''
        var error_msg = null
        // let parser = new text_parser.AsciiDocParser(editor.document.fileName, text)
        // const active_line_color = vscode.workspace.getConfiguration('AsciiDoc').get('active_line_color', 'LightBlue');

        // var body = await parser.parseText().catch((err) => {
        //   console.error(err)
        //   return this.errorHtml(err)
        // })
        // if(error_msg != null)
        //   html = error_msg
        // vscode.window.showInformationMessage('podlite' + JSON.stringify({'editor!.document.languageId':editor!.document.languageId, 'editor!.document':editor!.document}))
        if (editor!.document && editor!.document.languageId === 'podlite') {
            vscode.window.showInformationMessage('podlite111')
          html = `<!DOCTYPE html>
              <html
                <head>
                //   <script src="{ext_path + "/assets/scroll-to-element.js"}"></script>
                //   <script src="{ext_path + "/assets/mermaid.min.js"}"></script>
                  <script>mermaid.initialize({startOnLoad:true});</script>
                  <style>
                  body { padding: 0; margin: 0; }
                  .active-line {
                    background-color:{active_line_color};
                  }
                  </style>
                </head>
                <body onload="ScrollToLine({line})">
                <div class="data-line-1"></div>
                {body}
                </body>
              </html>`
        }
        this.lastPreviewHTML = html
        resolve(html)
      })
      return p
    }

    private errorHtml(error: string): string {
      return `<body>${error}</body>`
    }
  }
  let provider: TextDocumentContentProvider

  function getPodliteUri(uri: vscode.Uri) {
	return uri.with({ scheme: 'podlite', path: uri.path + '.rendered', query: uri.toString() });
}

  const previewUri = vscode.Uri.parse('podlite://authority/podlite')
  // let document: vscode.TextDocument = null

  provider = new TextDocumentContentProvider(previewUri)
  let registration = vscode.workspace.registerTextDocumentContentProvider('podlite', provider)

  vscode.workspace.onDidSaveTextDocument(e => {
    provider.update(previewUri)
  })

  vscode.workspace.onDidChangeTextDocument(e => {
    // if (isAsciiDocFile(e.document))
    if (true) {
      provider.needsRebuild = true
      if (e.contentChanges.length > 0) {
        var range = e.contentChanges[0].range
        var line = range.start.line
        provider.current_line = line
      }
    }
  })

  vscode.window.onDidChangeTextEditorSelection(e => {
    provider.current_line = e.selections[0].anchor.line
    provider.needsRebuild = true
  })

  vscode.window.onDidChangeActiveTextEditor(e => {
    // if (isAsciiDocFile(e.document))
    if (true) {
      provider.needsRebuild = true
      provider.update(previewUri)
    }
  })
  let displayColumn: vscode.ViewColumn;
  switch (vscode.window.activeTextEditor!.viewColumn)
  {
      case vscode.ViewColumn.One:
          displayColumn = vscode.ViewColumn.Two;
          break;
      case vscode.ViewColumn.Two:
      case vscode.ViewColumn.Three:
          displayColumn = vscode.ViewColumn.Three;
          break;
  }

  function getViewColumn(sideBySide:boolean): vscode.ViewColumn|undefined {
	const active = vscode.window.activeTextEditor;
	if (!active) {
		return vscode.ViewColumn.One;
	}

	if (!sideBySide) {
		return active.viewColumn;
	}

	switch (active.viewColumn) {
		case vscode.ViewColumn.One:
			return vscode.ViewColumn.Two;
		case vscode.ViewColumn.Two:
			return vscode.ViewColumn.Three;
	}

	return active.viewColumn;
}

  const previewToSide = vscode.commands.registerCommand('podlite.previewToSide', () => {
    vscode.commands
      .executeCommand('vscode.previewHtml', previewUri, displayColumn, 'podlite')
      .then(() => {}, vscode.window.showErrorMessage)
  })

  const pathOpts = { scheme: 'vscode-resource' }
  const reduxDevtoolsCorePath = vscode.Uri.file(
    path.join(context.extensionPath, 'dist/build/static/js/main.8d26c4b9.js')
  )
  const reduxDevtoolsCorePathCss = vscode.Uri.file(
    path.join(context.extensionPath, 'dist/build/static/css/main.35a5a5ff.css')
  )
  const podliteViewerPath = vscode.Uri.file(
    path.join(context.extensionPath, 'out/index.js')
  )
    const podliteViewerPath2 = vscode.Uri.file(
    path.join(context.extensionPath, 'out/frontend.module.js')
  )


  const code= fs.readFileSync(podliteViewerPath2.fsPath, 'utf8')
  const codeCss= fs.readFileSync(reduxDevtoolsCorePathCss.fsPath, 'utf8')
  vscode.window.showInformationMessage('podlite111' + podliteViewerPath)
  let disposable = vscode.commands.registerCommand('podlite.preview', () => {
    // Создаем новую панель
    const panel = vscode.window.createWebviewPanel(
        'htmlPreview',
        'Podlite Preview',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            // retainContextWhenHidden: true 
        }
    );

    // Получаем активный редактор
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        // Получаем содержимое текущего файла
        const documentText = activeEditor.document.getText();
          const index_file = panel.webview.asWebviewUri(
        vscode.Uri.file(
        path.join(context.extensionPath, "out","frontend.module.js")
      )
          )
        const html=(documentText:string)=>`
<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<link rel="icon" href="/favicon.ico"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#000000"/>
<meta name="description" content="This site is dedicated to the Podlite markup language. Podlite online editor"/>
<link rel="manifest" href="/manifest.json"/>
<title>Podlite preview</title>
</head>
<body>

<code id="template" style="display:none"><pre>        
${documentText}
</pre></code><div id="root"></div>

<script  type="application/javascript" src="${index_file}"></script>

</body></html>
  `
        // Обновляем содержимое превью
        panel.webview.html = html(documentText);

        // Подписываемся на изменения в документе
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {

            if (e.document === activeEditor.document) {
                // panel.webview.html = e.document.getText();
                try {
                    // const document = {} as any; 
                    // document.createElement = ()=>{};
                    // panel.webview.html = ReactDOMServer.renderToString(<Podlite>{e.document.getText()}</Podlite>)
                    // panel.webview.html = html(e.document.getText());
                    const editor = vscode.window.activeTextEditor;
                        if (activeEditor && editor) {
                            const fileName = e.document.fileName;
                            // const line = activeEditor.selection.active.line;
                            // const line = e.selections[0].active.line;
                            //  const line = editor.selection.active.line;
                            // const line = e.document.lineAt(e.document.positionAt(0).line);
                            
                            const cursor = editor?.document.offsetAt(editor.selection.anchor);
                            panel.webview.postMessage({ 
                                command: "preview", 
                                text: JSON.stringify(e.document.getText()),
                                cursor,
                                // line,
                                fileName,
                            });
                        // vscode.window.showTextDocument(activeEditor.document, {
                        //     viewColumn: activeEditor.viewColumn,
                        //     preserveFocus: true // Keep focus in editor
                        // });
                    }
                }
                catch (e) {
                    vscode.window.showInformationMessage('Error: ' + e)
                    console.error(e)
                }
                // panel.webview.html  = ReactDOMServer.renderToString(<h1><Podlite/>{e.document.getText()}</h1>)
            }
        });
        // // Subscribe to scroll/selection changes in the editor
        // const selectionChangeSubscription = vscode.window.onDidChangeTextEditorSelection(e => {
        //     if (e.textEditor === activeEditor && panel) {
        //         const line = e.selections[0].active.line;
        //         const cursor = e.textEditor.document.offsetAt(e.selections[0].active);
        //         panel.webview.postMessage({ 
        //             command: "scroll", 
        //             line: line,
        //             cursor
        //         });
        //     }
        // });
                // Subscribe to scroll events in the editor
        // Since VS Code doesn't have a direct scroll event, we'll use visible ranges
        const visibleRangesChangeSubscription = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            if (e.textEditor === activeEditor && panel && e.visibleRanges.length > 0) {
                // Get the first visible line
                const firstVisibleLine = e.visibleRanges[0].start.line;
                panel.webview.postMessage({ 
                    command: "scroll", 
                    line: firstVisibleLine
                });
            }
        });
        // Очищаем подписку при закрытии панели
        panel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            // selectionChangeSubscription.dispose();
            visibleRangesChangeSubscription.dispose();
        });
    }
});

context.subscriptions.push(disposable);

//   const preview = vscode.commands.registerCommand('podlite.preview', () => {
//     provider.needsRebuild = true
//     provider.active_update(previewUri)
    
//     vscode.window.showInformationMessage('podlite - ' + getViewColumn(true) + '  ->' + vscode.window.activeTextEditor!.viewColumn)
//     vscode.commands
//       .executeCommand('vscode.previewHtml', previewUri, getViewColumn(true), "podlire")
//       .then(() => {}, vscode.window.showErrorMessage)

      
//   })

  let openSettings = vscode.commands.registerCommand('podlite.openSettings', async () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'Podlite')
  })

  let createDoc = vscode.commands.registerCommand('podlite.ai.createDoc', async () => {
    // Accessing the active text editor
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showInformationMessage('No active Text editor')
      return
    }

    const config = vscode.workspace.getConfiguration('podlite.ai.openAI')
    // Get each setting using the .get method and the configuration's property key
    const apiKey = config.get('apiKey', '')
    const engine = config.get('engine', 'gpt-3.5-turbo-1106')
    const maxTokens = config.get('maxTokens', 360)
    if (
      typeof apiKey !== 'string' ||
      apiKey.length === 0 ||
      typeof engine !== 'string' ||
      typeof maxTokens !== 'number'
    ) {
      vscode.window
        .showErrorMessage('Podlite. Please check your settings.', { modal: true }, { title: 'Open Settings' })
        .then(selection => {
          if (selection && selection.title === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'Podlite')
          }
        })
      return
    }

    if (!config) {
      vscode.window.showInformationMessage('No active Text editor')
      return
    }

    // Fetching the selected text from the editor
    const selection = editor.selection
    const functionText = editor.document.getText(selection).trim()
    const lang = editor.document.languageId
    const nowLineText = editor.document.lineAt(selection.start.line)
    console.log(JSON.stringify({ lang }, null, 2))
    let insertText = `/**
=begin pod
=head1 {name}

{description}

=head2 Parameters

{params}

=head2 Returns

{return}

=end pod
*/
`

    // Get the prompt from the settings
    let promptTemplate = vscode.workspace.getConfiguration('podlite.ai.openAI').get('docPrompt') as string
    const note = ''
    let prompt = templateEngine(promptTemplate, { functionText, lang, note })

    let system = `Please describe the function in a structured JSON format.
The JSON should include a \`description\` of the function, detailing its purpose and how it works.
Add to root sections of the JSON object key \`name\` of explaned function.
 It should also contain a \`params\` section, describing the parameters the function takes,
 including their names and descriptions. Please write params as object with key is parameter name and value is text content for key params in result JSON.
 Finally, include a \`return\` section, explaining 
 what the function returns in text format. Ensure the JSON structure follows this template.`

    vscode.window.showInformationMessage('Generating documentation. Please wait...')
    const data = {
      model: engine,
      messages: [
        { role: 'user', content: prompt },
        {
          role: 'system',
          content: 'You are a helpful assistant.please return valid JSON.' + system,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      temperature: 0.7,
    }
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'content-type': 'application/json',
        Authorization: ` Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
      method: 'POST',
    })
    if (response.ok) {
      let json = (await response.json()) as Record<string, any>
      console.log({ 'api response': json })
      const textResult = JSON.parse(json?.choices[0].message.content || '')
      console.log(textResult)
      const startLine = selection.start.line
      //{ line: 0, character: 1}
      let pos: vscode.Position
      pos = new vscode.Position(startLine, 0)

      editor.edit((editBuilder: vscode.TextEditorEdit) => {
        insertText = templateEngine(insertText, textResult as Record<string, any>)
        editBuilder.insert(pos, insertText)
      })
    } else {
      console.log('Error HTTP: ' + response.status)
      vscode.window.showInformationMessage('Error HTTP: ' + response.status)
    }
  })

  context.subscriptions.push(createDoc, openSettings, registration, previewToSide)
}

export function deactivate() {}
