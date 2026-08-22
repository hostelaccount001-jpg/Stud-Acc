import { a as getServerFnById, t as TSS_SERVER_FUNCTION } from "./server-DxD86aHG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createSsrRpc-humr6_nj.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
export { createSsrRpc as t };
