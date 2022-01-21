/**
 * package.json の一部を exe に埋め込むための部分型
 */
interface PackageJsonReduced {
    version: string;
}

declare var packageJson: PackageJsonReduced;


declare module "PackageJsonReduced" {
	export = packageJson
}
