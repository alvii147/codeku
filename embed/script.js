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

const PISTON_EXECUTE_URL = 'https://emkc.org/api/v2/piston/execute';
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

const pistonExecute = (language, version, code) => {
  return fetch(PISTON_EXECUTE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'language': language,
      'version': version,
      'files': [
        {
          'content': code,
        }
      ],
      'stdin': '',
      'args': [],
    }),
  });
};

const getParams = () => {
  const params = new URLSearchParams(window.location.search);
  const languageOptions = params.get('language_options')?.split(',') ?? Object.keys(LANGUAGE_CONFIG);
  const language = (params.get('language') ?? languageOptions[0]);

  languageOptions.forEach((lang) => {
    LANGUAGE_CONFIG[lang].code = params.get(`code_${lang}`) ?? LANGUAGE_CONFIG[lang].code
  });

  return {
    language,
    languageOptions,
  };
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

const runCode = () => {
  const language = document.getElementById('language-select').value;
  const languageConfig = LANGUAGE_CONFIG[language];

  pistonExecute(
    language, languageConfig.version, editor.state.doc.toString())
  .then(response => {
    if (!response.ok) {
      throw new Error('network failure');
    }

    return response.json();
  })
  .then(data => {
    document.getElementById('results-stdout').innerHTML = data.run.stdout.replace(/\n/g, '<br>');
    document.getElementById('results-stderr').innerHTML = data.run.stderr.replace(/\n/g, '<br>');
  })
  .catch(error => {
    console.error(error);
  });
};

const resetCode = () => {
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

const focusEditor = () => {
  editor.focus();
};

const languageSelectElement = document.getElementById('language-select');
params.languageOptions.forEach((language) => {
  languageSelectElement.add(new Option(LANGUAGE_CONFIG[language].name, language));
});

languageSelectElement.value = params.language;
runCode();

document.getElementById('editor').addEventListener('click', focusEditor);
document.getElementById('language-select').addEventListener('change', resetCode);
document.getElementById('reset-button').addEventListener('click', resetCode);
document.getElementById('run-button').addEventListener('click', runCode);
