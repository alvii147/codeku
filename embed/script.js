import { basicSetup } from 'https://esm.sh/codemirror';
import { EditorView } from 'https://esm.sh/@codemirror/view';
import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark';
import { Compartment } from 'https://esm.sh/@codemirror/state';

import { cpp } from 'https://esm.sh/@codemirror/lang-cpp';
import { go } from 'https://esm.sh/@codemirror/lang-go';
import { java } from 'https://esm.sh/@codemirror/lang-java';
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript';
import { python } from 'https://esm.sh/@codemirror/lang-python';
import { php } from 'https://esm.sh/@codemirror/lang-php';
import { rust } from 'https://esm.sh/@codemirror/lang-rust';

/** 
 * Public URL for Piston API code execution endpoint.
 * @constant {string}
 */
const PISTON_EXECUTE_URL = 'https://emkc.org/api/v2/piston/execute';

/**
 * Language configuration for supported programming languages.
 * @constant {Object.<string, {extension: any, version: string, name: string, code: string}>}
 */
const LANGUAGE_CONFIG = {
  c: {
    extension: cpp(),
    version: '10.2.0',
    name: 'C',
    code: `#include <stdio.h>

int main() {
    printf("Hello, from codeku!\\n");
    return 0;
}`
  },
  cpp: {
    extension: cpp(),
    version: '10.2.0',
    name: 'C++',
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, from codeku!" << endl;
    return 0;
}`
  },
  go: {
    extension: go(),
    version: '1.20.2',
    name: 'Go',
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, from codeku!")
}`,
  },
  java: {
    extension: java(),
    version: '15.0.2',
    name: 'Java',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, from codeku!");
    }
}`
  },
  javascript: {
    extension: javascript(),
    version: '18.15.0',
    name: 'JavaScript',
    code: `console.log("Hello, from codeku!");`,
  },
  python: {
    extension: python(),
    version: '3.10.0',
    name: 'Python',
    code: `print("Hello, from codeku!")`,
  },
  php: {
    extension: php(),
    version: '8.2.3',
    name: 'PHP',
    code: `<?php
    echo "Hello, from codeku!";
?>`,
  },
  rust: {
    extension: rust(),
    version: '1.68.2',
    name: 'Rust',
    code: `fn main() {
    println!("Hello, from World!");
}`,
  },
  typescript: {
    extension: javascript({ typescript: true }),
    version: '5.0.3',
    name: 'TypeScript',
    code: `console.log("Hello, from codeku!");`,
  },
};

/**
 * Executes code on Piston.
 * @async
 * @function pistonExecute
 * @param {string} language - Programming language.
 * @param {string} version - Version of programming language.
 * @param {string} code - Raw code to execute.
 * @returns {Promise<Response>} Response from Piston.
 */
const pistonExecute = async (language, version, code) => {
  const max_retries = 3;
  const delay = 1000;

  for (let attempt = 0; attempt < max_retries; attempt++) {
    const response = await fetch(PISTON_EXECUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language,
        version,
        files: [{ content: code }],
        stdin: '',
        args: [],
      }),
    });

    if (response.status !== 429) {
      return response;
    }

    // exponential backoff delay
    await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt)));
  }
};

/**
 * Extracts URL query parameters and overrides configuration settings with URL query parameters.
 * @function getParams
 * @returns {{language: string, languageOptions: string[]}} Query parameters.
 */
const getParams = () => {
  const params = new URLSearchParams(window.location.search);
  const languageOptions = params.get('language_options')?.split(',') ?? Object.keys(LANGUAGE_CONFIG);
  const language = (params.get('language') ?? languageOptions[0]);

  languageOptions.forEach((lang) => {
    // override default code with code provided in query parameter
    LANGUAGE_CONFIG[lang].code = params.get(`code_${lang}`) ?? LANGUAGE_CONFIG[lang].code;
  });

  return {
    language,
    languageOptions,
  };
};

/**
 * Executes editor code and displays results.
 * @async
 * @function runCode
 * @param {EditorView} editor - Editor object.
 */
const runCode = (editor) => {
  const language = document.getElementById('language-select').value;
  const resultsStdout = document.getElementById('results-stdout');
  const resultsStderr = document.getElementById('results-stderr');
  const runButton = document.getElementById('run-button');

  runButton.disabled = true;

  pistonExecute(language, LANGUAGE_CONFIG[language].version, editor.state.doc.toString())
    .then(response => {
      if (!response.ok) {
        throw new Error('network failure');
      }

      return response.json();
    })
    .then(data => {
      if (data.run.signal == 'SIGKILL') {
        throw new Error('server time out');
      }

      resultsStdout.innerHTML = data.run.stdout.replace(/\n/g, '<br>');
      resultsStderr.innerHTML = data.run.stderr.replace(/\n/g, '<br>');
    })
    .catch(error => {
      resultsStdout.innerHTML = '';
      resultsStderr.innerHTML = error;
    })
    .finally(() => {
      runButton.disabled = false;
    });
};

/**
 * Resets editor to default code for currently selected language.
 * @function resetCode
 * @param {EditorView} editor - Editor object.
 * @param {Compartment} compartment - Editor compartment object.
 */
const resetCode = (editor, compartment) => {
  const language = document.getElementById('language-select').value;

  editor.dispatch({
    effects: compartment.reconfigure(LANGUAGE_CONFIG[language].extension),
    changes: {
      from: 0,
      to: editor.state.doc.length,
      insert: LANGUAGE_CONFIG[language].code,
    },
  });
};

/**
 * Sets language dropdown options.
 * @function setLanguageOptions
 * @param {{language: string, languageOptions: string[]}} params - Query parameters.
 */
const setLanguageOptions = (params) => {
  const languageSelectElement = document.getElementById('language-select');

  params.languageOptions.forEach((language) => {
    languageSelectElement.add(new Option(LANGUAGE_CONFIG[language].name, language));
  });

  languageSelectElement.value = params.language;
};

const params = getParams();
const compartment = new Compartment();

const editor = new EditorView({
  doc: LANGUAGE_CONFIG[params.language].code,
  parent: document.getElementById('editor'),
  extensions: [
    basicSetup,
    oneDark,
    compartment.of(LANGUAGE_CONFIG[params.language].extension),
  ],
});

// set languages dropdown options
setLanguageOptions(params);
// set editor to focus on click of its surrounding div
document.getElementById('editor').addEventListener('click', () => editor.focus());
// set editor code to reset on language change
document.getElementById('language-select').addEventListener('change', () => resetCode(editor, compartment));
// set editor code to reset on reset button click
document.getElementById('reset-button').addEventListener('click', () => resetCode(editor, compartment));
// set current editor code to get executed on run button click
document.getElementById('run-button').addEventListener('click', () => runCode(editor));

// run code initially
runCode(editor);
