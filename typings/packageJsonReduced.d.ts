/**
 * package.json ファイルの内容を一部のみ nexe ビルドに含めるためのサブセット
 */
interface PackageJsonReduced {
    version: string;
}

declare var packageJson: PackageJsonReduced;


declare module "PackageJsonReduced" {
	export = packageJson
}
