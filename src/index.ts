/**
 * 创建代码片段
 */

 import chalk from 'chalk'
 import * as fs from 'fs-extra'
 import * as path from 'path'
 import * as sass from 'sass'
 import * as yargs from 'yargs'

 // 创建 css/sass 变量 代码片段
export async function createVarSnippet(
    varContent: string,
    snippetPath: string,
    type: 'sass' | 'css' = 'sass'
) {
    const isSass = type === 'sass'
    const varReg = isSass ? /(\$[\w|-]+):\s(.+)/g : /(--[\w|-]+):\s(.+)/g

    const vars = (varContent.match(varReg) || []).map(v => {
        const entries = v.split(':')
        return {
            name: entries[0],
            desc: entries[1] ? entries[1].replace('; //', ' ').trim() : ''
        }
    })

    const snippets: Record<string, any> = {}
    vars.forEach(v => {
        const body = isSass ? `\\${v.name};` : `var(${v.name})`
        snippets[v.name] = {
            prefix: v.name,
            body,
            description: v.desc,
            scope: 'sass,scss,css'
        }

        const hexReg = /(#[0-9A-F]{6})|(^#[0-9A-F]{3})/gi
        const hexColor = (v.desc.match(hexReg) || [])[0]

        if (hexColor) {
            snippets[hexColor + v.name] = {
                prefix: hexColor,
                body,
                description: v.desc,
                scope: 'sass,scss,css'
            }
        }
    })

    const snippetContent = JSON.stringify(snippets, null, 4)

    await fs.ensureFile(snippetPath)
    await fs.writeFile(snippetPath, snippetContent, 'utf8')
    console.log(chalk.green('snippet created'))
}

// Create sass variable snippets
export function createSassVarSnippet(varPath: string, snippetPath: string) {
    return createVarSnippet(fs.readFileSync(varPath, 'utf8'), snippetPath, 'sass')
}

// Create css variable snippets
export function createCssVarSnippet(
    varPath: string,
    snippetPath: string,
    compile = false
) {
    let content = fs.readFileSync(varPath, 'utf8')
    if (compile) {
        // 将 sass 编译成 css, 因为有些变量是使用 sass 变量定义的
        content = sass
            .renderSync({
                file: varPath,
                includePaths: [path.dirname(varPath)]
            })
            .css.toString()
    }

    // 将 var(xxx) 替换成对应的值
    const values: Record<string, any> = {}
    content.replace(/([\w]+): ([\w]+)/gi, (match, varName, value) => {
        // 颜色只支持第一个定义的颜色
        if (!values[varName]) {
            values[varName] = value
        }
        return match
    })
    content = content.replace(/var\(([\w]+)\)/gi, (match, varName) => {
        return values[varName]
    })

    createVarSnippet(content, snippetPath, 'css')
}

const command: yargs.CommandModule = {
    command: 'create',
    describe: 'Create css var snippets',
    builder: {
        type: {
            describe: 'snippet 类型',
            choices: ['sass-var', 'css-var'],
            default: 'sass-var'
        },
        source: {
            alias: 's',
            description: '源文件目录',
            default: path.resolve('src/style/base/var.scss')
        },
        target: {
            alias: 't',
            description: 'snippet 生成目录'
        },
        compile: {
            alias: 'c',
            default: false,
            type: 'boolean',
            description: '是否需要编译 sass'
        }
    },
    handler(args) {
        const targetPath = args.target
            ? path.resolve(args.target as string)
            : path.resolve('.vscode/sass-var.code-snippets')

        const cssTargetPath = args.target
            ? path.resolve(args.target as string)
            : path.resolve('.vscode/css-var.code-snippets')

        switch (args.type) {
            case 'sass-var':
                createSassVarSnippet(
                    path.resolve(args.source as string),
                    targetPath
                )
                break
            case 'css-var':
                createCssVarSnippet(
                    path.resolve(args.source as string),
                    cssTargetPath,
                    args.compile as boolean
                )
                break
            default:
                console.log(`Undefind snippet type: ${args.type}`)
        }
    }
}

export const snippet = command

export default command
