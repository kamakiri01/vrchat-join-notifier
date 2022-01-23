/**
 * package.json の一部を exe に埋め込むためのサブセット
 */
interface PackageJsonReduced {
    version: string;
}

declare var packageJson: PackageJsonReduced;


declare module "PackageJsonReduced" {
	export = packageJson
}
