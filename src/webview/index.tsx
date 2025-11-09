
import React, { useState, useEffect } from 'react';
import { createRoot } from "react-dom/client"
import Podlite from '@podlite/to-jsx'
import { Editor2 as Editor, WindowWrapper } from '@podlite/editor-react'
import { podlite as podlite_core } from 'podlite'

import './styles/default.css'
// import { Main } from "./main"
// declare global {
//     var window: Window;
// }
const Test = () => {
    return (<h1>ok</h1>)
}
const Main = ({init}:{init?:string}) => {
        const text1 =  `Hello World`;
    // return (<Test>sdssd</Test>)
    const file = `
    =begin pod 
        asdasdasdasdsad
        =end pod
    `
   const [text, setText] = useState(init);
   const [line, setLine] = useState(1);
      useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data;
      console.log({message})
      switch (message.command) {
        case "preview":
          const new_text = JSON.parse(message.text)
          try {
            const podlite = podlite_core({ importPlugins: true })
            const treeAfterParsed = podlite.parse(new_text, {podMode: 0})
            const res = podlite.toAst(treeAfterParsed)
            setText(new_text);
            // setLine(message.line || 1);  
          } catch (e) {
          }
          break;
          case "scroll":
            console.log('set Line ' + message.line)
            setLine(message.line || 1);
         
          break;
      }
    });

    return () => {
    //   return window.removeEventListener('message', handler);
    };
  }, []);

//   // wrap all elements and add line link info
//   const wrapFunction = (node: any, children:any) => {
//     if (node?.location?.start?.line) {
//       const line = node.location.start.line

//       return (
//         <div key={line} className="line-src" data-line={line} id={`line-${line}`}>
//           {children}
//         </div>
//       )
//     } else {
//       return children
//     }
//   }

//   const wrapFunctionNoLines = (node: Node, children:any) => children

//     // return (<Podlite file={text} mode='md'/>)
//       const defaultPreview = (source: string) => {
//     const result = <Podlite wrapElement={wrapFunction} tree={getTree(source)} mode='md'/>
//     return { result }
//   }
    console.log({line})
    return (<Editor
                height={'100%'}
                value={text}
                enablePreview={true}
                previewWidth={'100%'}
                basicSetup={{ defaultKeymap: false }}
                readOnly={false}
                isFullscreen={true}
                startLinePreview={line}
    
              />
    )
    // return (<h1>Rest</h1>)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).vscode = window.acquireVsCodeApi()

const container = document.querySelector("#root")
const panelContainer = document.querySelector("#root-panel")
const initText = (document.querySelector("#template") as HTMLElement)?.innerText
console.log({initText})

if (container) {
  const root = createRoot(container)
  root.render(<Main init={initText}/>)
}

if (panelContainer) {
  const root = createRoot(panelContainer)
  root.render(<Main />)
}