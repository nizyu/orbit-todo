import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 毎回テストの後にクリーンアップを行う
afterEach(() => {
	cleanup();
});
