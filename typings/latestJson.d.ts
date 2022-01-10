interface LatestJson {
    version: number;
}

declare var latestJson: LatestJson;


declare module "LatestJson" {
	export = latestJson
}