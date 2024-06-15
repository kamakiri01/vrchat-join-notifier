const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json'); // node_modules\iconv-lite\encodings\tables\gb18030-ranges.json の解決
const replace = require('@rollup/plugin-replace'); // binpackのtwoToThe32変数定義が宣言されていない箇所を修正

export default (async () => ({
	input: 'lib/winExeStandalone.js',
	plugins: [
		resolve(),
		commonjs(),
		json(),
		replace({
			"twoToThe32 =": "var twoToThe32=", // 置換後を再マッチしないよう、置換後は空白を入れない
			"    b = new Buffer": "var b = new Buffer", // 置換対象をvar宣言のないものに限るため、置換元に空白を含める
			delimiters: ['', ''] // 空白を挟む箇所を置き換えるため、単語で区切らせない
		}),
	],
	output: {
		file: 'tmp/bundle.js',
		format: 'cjs',
	},
	bundleConfigAsCjs: true,

}))();
