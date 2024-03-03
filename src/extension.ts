import * as vscode from 'vscode'

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

  context.subscriptions.push(createDoc, openSettings)
}

export function deactivate() {}
