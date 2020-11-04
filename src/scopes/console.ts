import dateFormat from 'dateformat'
import FileSaver from 'file-saver'

import {printer} from '@/mal/printer'
import {readJS} from '@/mal/reader'
import Scope from '@/mal/scope'
import {MalFn, MalNil, MalString, MalVal} from '@/mal/types'
import renderToSvg from '@/renderer/render-to-svg'

import ViewScope, {createViewScope} from './view'

const ConsoleScope = new Scope(ViewScope, 'console')

function generateFilename(name?: string) {
	if (!name) {
		name = `sketch_${dateFormat('mmm-dd-yyyy_HH-MM-ss').toLowerCase()}`
	}
	return `${name}.glisp`
}

function copyToClipboard(str: string) {
	navigator.clipboard.writeText(str).then(() => {
		printer.log('Copied to clipboard')
	})

	return MalNil.from()
}

function generateSketchURL(codeURL: string) {
	const url = new URL(location.href)
	url.searchParams.set('code_url', codeURL)
	const canvasURL = url.toString()

	copyToClipboard(canvasURL)

	printer.log(`Sketch URL: ${canvasURL}`)

	return MalNil.from()
}

ConsoleScope.def('copy-to-clipboard', (str: MalVal) => {
	return copyToClipboard(str.value as string)
})

ConsoleScope.def(
	'generate-sketch-url',
	MalFn.from((url: MalVal) => generateSketchURL(url.value as string)).withMeta(
		readJS({
			doc: 'Generates Code URL',
			params: [
				{
					label: 'Source',
					type: 'string',
				},
			],
			'initial-params': [''],
		})
	)
)

ConsoleScope.def('open-link', (url: MalVal) => {
	window.open(url.value as string, '_blank')
	return MalString.from(`Open URL: ${url}`)
})

ConsoleScope.def('download-sketch', (...args: MalVal[]) => {
	const filename = generateFilename(args[0].value as string)

	const sketch = ConsoleScope.var('*sketch*').value as string

	const file = new File([sketch], filename, {
		type: 'text/plain;charset=utf-8',
	})

	FileSaver.saveAs(file)

	return MalNil.from()
})

ConsoleScope.def('copy-as-svg', () => {
	const viewExp: MalVal | undefined = ConsoleScope.var('*view*')

	const svg = renderToSvg(viewExp, 500, 500)
	copyToClipboard(svg)
	return MalNil.from()
})

const renderViewScope = createViewScope()
let renderWindow: Window | null

// ConsoleScope.def(
// 	'export-image',
// 	setMeta(
// 		(...xs: MalVal[]) => {
// 			const exec = async () => {
// 				const sketch = ConsoleScope.var('*sketch*').value as string
// 				const code = `(sketch ${sketch}\nnil)`

// 				renderViewScope.setup({guideColor: null})
// 				let viewExp = renderViewScope.readEval(code)

// 				if (viewExp === undefined) {
// 					throw new MalError('Invalid sketch')
// 				}

// 				const options = MalMap.fromMalSeq(...xs).value

// 				if (options.selector) {
// 					viewExp = ConsoleScope.eval(
// 						MalList.from(
// 							MalSymbol.from('filter-elements'),
// 							options.selector,
// 							viewExp
// 						)
// 					)
// 					if (!viewExp) {
// 						throw new MalError(
// 							`Element ${printExp(options.selector, true)} does not exist`
// 						)
// 					}
// 				}

// 				const bounds = ConsoleScope.eval(
// 					MalList.from(MalSymbol.from('get-element-bounds'), viewExp)
// 				)?.toObject() as number[]
// 				if (!bounds) {
// 					throw new MalError('Cannot retrieve bounds')
// 				}

// 				const image = await getRendereredImage(viewExp, {
// 					format: options.format.value as string,
// 					scaling: options.scaling.value as number,
// 					bounds,
// 				})

// 				if (renderWindow) {
// 					renderWindow.close()
// 				}

// 				renderWindow = window.open('about:blank', 'Image for canvas')
// 				renderWindow?.document.write(`<img src=${image} />`)

// 				console.timeEnd('render')
// 			}

// 			exec()

// 			return MalNil.from()
// 		},
// 		readJS({
// 			doc: 'Renders and exports a sketch',
// 			params: [
// 				{
// 					type: 'map',
// 					variadic: 'true',
// 					items: [
// 						{
// 							key: MalKeyword.from('format'),
// 							type: 'string',
// 							ui: 'dropdown',
// 							values: ['png', 'jpeg', 'webp'],
// 						},
// 						{
// 							key: MalKeyword.from('scaling'),
// 							type: 'number',
// 							default: 1,
// 							validator: (x: number) => Math.round(Math.max(1, x) * 2) / 2,
// 						},
// 						{key: MalKeyword.from('selector'), type: 'string', default: ''},
// 					],
// 				},
// 			],
// 			'initial-params': [
// 				MalKeyword.from('format'),
// 				'png',
// 				MalKeyword.from('scaling'),
// 				1,
// 				MalKeyword.from('selector'),
// 				'',
// 			],
// 		})
// 	)
// )

// ConsoleScope.def(
// 	'export-video',
// 	setMeta(
// 		(...xs: MalVal[]) => {
// 			const options = {
// 				format: 'gif',
// 				scaling: 1,
// 				symbol: 'time',
// 				start: 0,
// 				duration: 1,
// 				fps: 24,
// 				bounds: [0, 0, 200, 200],
// 				...MalMap.fromMalSeq(...xs).toObject(),
// 			} as {
// 				format: 'gif'
// 				scaling: number
// 				symbol: string
// 				start: number
// 				duration: number
// 				fps: number
// 				bounds: number[]
// 			}

// 			const renderTime = async (time: number) => {
// 				const sketch = ConsoleScope.var('*sketch*').value as string
// 				const code = `(sketch-at-time "${options.symbol}" ${time} ${sketch}\nnil)`

// 				renderViewScope.setup({guideColor: null})
// 				const viewExp = renderViewScope.readEval(code)
// 				if (viewExp === undefined) {
// 					throw new MalError('Invalid sketch')
// 				}

// 				const image = await getRendereredImage(viewExp, {
// 					format: options.format,
// 					scaling: options.scaling,
// 					bounds: options.bounds,
// 				})

// 				return image
// 			}

// 			const exec = async () => {
// 				const gif = new GIF({workers: 2, quality: 10})

// 				const startTime = performance.now()

// 				const frameCount = Math.round(options.duration * options.fps)
// 				const frameDuration = 1 / options.fps
// 				const times = Array(frameCount)
// 					.fill(0)
// 					.map((_, i) => [i * frameDuration, i])

// 				for (const [time, i] of times) {
// 					const data = (await renderTime(time)) as string
// 					const img = new Image()
// 					img.src = data
// 					img.width = options.bounds[2] * options.scaling
// 					img.height = options.bounds[3] * options.scaling
// 					gif.addFrame(img, {delay: frameDuration * 1000})

// 					printer.log(`Rendering... ${i + 1}/${frameCount} Frames`)
// 				}

// 				gif.on('finished', (blob: Blob) => {
// 					const deltaTime = (performance.now() - startTime) / 1000
// 					printer.log(`Render finished. ${deltaTime.toFixed(1)}s`)

// 					window.open(URL.createObjectURL(blob))
// 				})

// 				gif.render()
// 			}

// 			exec()

// 			return MalNil.from()
// 		},
// 		readJS({
// 			doc: 'Exports a video',
// 			params: [
// 				{
// 					type: 'map',
// 					variadic: true,
// 					items: [
// 						{
// 							key: MalKeyword.from('format'),
// 							type: 'string',
// 							ui: 'dropdown',
// 							values: ['gif'],
// 						},
// 						{
// 							key: MalKeyword.from('scaling'),
// 							type: 'number',
// 							default: 1,
// 							validator: (x: number) => Math.round(Math.max(1, x) * 2) / 2,
// 						},
// 						{key: MalKeyword.from('symbol'), type: 'string'},
// 						{key: MalKeyword.from('start'), type: 'number', default: 0},
// 						{key: MalKeyword.from('duration'), type: 'number', default: 1},
// 						{
// 							key: MalKeyword.from('fps'),
// 							label: 'FPS',
// 							type: 'number',
// 							default: 24,
// 						},
// 						{
// 							key: MalKeyword.from('bounds'),
// 							type: 'rect2d',
// 							default: [0, 0, 100, 100],
// 						},
// 					],
// 				},
// 			],
// 			'initial-params': [
// 				MalKeyword.from('format'),
// 				'gif',
// 				MalKeyword.from('scaling'),
// 				1,
// 				MalKeyword.from('symbol'),
// 				'time',
// 				MalKeyword.from('start'),
// 				0,
// 				MalKeyword.from('duration'),
// 				1,
// 				MalKeyword.from('fps'),
// 				24,
// 				MalKeyword.from('bounds'),
// 				[0, 0, 200, 200],
// 			],
// 		})
// 	)
// )

// ConsoleScope.def(
// 	'publish-gist',
// 	setMeta(
// 		(...args: MalVal[]) => {
// 			const code = ConsoleScope.var('*sketch*').value as string

// 			// eslint-disable-next-line prefer-const
// 			const {name, user, token} = MalMap.fromMalSeq(...args).toObject() as {
// 				name: string
// 				user: string
// 				token: string
// 			}

// 			if (typeof user !== 'string' || typeof token !== 'string') {
// 				throw new MalError(`Parameters :user and :token must be specified.
// 	Get the token from https://github.com/settings/tokens/new with 'gist' option turned on.`)
// 			}

// 			localStorage.setItem('gist_api_token', JSON.stringify({user, token}))

// 			const filename = generateFilename(name)

// 			async function publishToGist() {
// 				const res = await fetch('https://api.github.com/gists', {
// 					method: 'POST',
// 					headers: {
// 						Authorization: 'Basic ' + btoa(`${user}:${token}`),
// 					},
// 					body: JSON.stringify({
// 						public: true,
// 						files: {
// 							[filename]: {
// 								content: code,
// 							},
// 						},
// 					}),
// 				})

// 				if (res.ok) {
// 					const data = await res.json()

// 					const codeURL = data.files[filename].raw_url
// 					generateSketchURL(codeURL)
// 				} else {
// 					printer.error('Invalid username or token')
// 				}
// 			}

// 			publishToGist()

// 			printer.log(`Publishing to Gist... user=${user}, token=${token}`)

// 			return MalNil.from()
// 		},
// 		readJS({
// 			doc:
// 				'Publishes the current sketch to Gist then generates Code URL. Please set `user` to your GitHub username and `token` to a personal access token that you can generate from [Developer Settings](https://github.com/settings/tokens/new) with the **gist** option turned on.',
// 			params: [
// 				{
// 					label: 'Name',
// 					type: 'string',
// 				},
// 				{
// 					type: 'map',
// 					variadic: true,
// 					items: [
// 						{
// 							key: MalKeyword.from('user'),
// 							label: 'User',
// 							type: 'string',
// 						},
// 						{
// 							key: MalKeyword.from('token'),
// 							label: 'Token',
// 							type: 'string',
// 						},
// 					],
// 				},
// 			],
// 			'initial-params': () => {
// 				const sketchName = generateFilename()

// 				let user = '',
// 					token = ''

// 				const saved = localStorage.getItem('gist_api_token')
// 				if (saved !== null) {
// 					;({user, token} = JSON.parse(saved) as {
// 						user: string
// 						token: string
// 					})
// 				}

// 				return [
// 					sketchName,
// 					MalKeyword.from('user'),
// 					user,
// 					MalKeyword.from('token'),
// 					token,
// 				]
// 			},
// 		})
// 	)
// )

ConsoleScope.def('generate-embed-url', () => {
	const sketch = ConsoleScope.var('*sketch*').value as string

	const url = new URL('embed.html', globalThis.location.href)
	url.searchParams.set('code', encodeURI(sketch))
	const urlString = url.toString()

	copyToClipboard(urlString)

	printer.log(`Embed URL: ${urlString}`)

	return MalNil.from()
})

export default ConsoleScope
