import { getGenerativeModel } from "firebase/ai";
import { z } from "zod";
import { ai } from "./firebase";
import type { Category, CheckListItem } from "./firestore";

export type SuggestForRefineTask = {
	checklist: CheckListItem[];
	advice: string;
};

export async function suggestTaskRefinement(
	taskTitle: string,
	taskDesc: string | null,
	currentChecklist: CheckListItem[],
	baseCategory: Category | null,
	subCategory: Category | null,
): Promise<SuggestForRefineTask> {
	if (!ai) {
		throw new Error("Firebase AI is not initialized.");
	}

	const model = getGenerativeModel(ai, {
		model: "gemini-2.5-flash",
	});

	const prompt = `
[依頼内容]
1. 以下のタスクに関する情報と背景を元に、タスクを達成するために必要な具体的なチェックリスト（サブタスク）を生成してください。
    - チェックリストの項目数は10個以下に抑えるようにしてください。
	- チェックリストの各項目は以下の条件を満たすようにしてください。
		- タスクの担当者が能動的に処理をできること（何かを待つなどのタスクは不要です）
		- 具体的でわかりやすいこと
		- 1つあたりの作業時間は30分以内程度で終わるものにすること
		- チェックリストの並び順は、作業の順序通りにしてください
	- 現在のチェックリストを参考にしてください。重複するタスクや、より良い表現があれば修正してください。
2. 成果物の品質を向上するためのタスク管理の観点から、アドバイスを簡潔にしてください。
    - 以下のような内容を想定しています
		- タスクの粒度が適切か
		- 不明確な部分はないか
		- 抜け漏れはないか
		- その他、タスク管理の観点からアドバイスがあれば記載してください

[期待する出力フォーマット]
返却値は必ずJSON形式のオブジェクトとしてください。オブジェクトは \`checklist\` (CheckListItemの配列) と \`advice\` (文字列) を持つオブジェクトとしてください。
Markdownのコードブロック (\`\`\`json ... \`\`\`) は使用せず、純粋なJSON配列文字列のみを出力してください。無理な場合はコードブロックで囲っても構いません。

[出力例]
{
  "checklist": [
    { "title": "要件を整理する", "completed": false },
    { "title": "関連ドキュメントを読む", "completed": false }
  ],
  "advice": "タスクの粒度が適切か"
}

[タスク情報]
[[タスクタイトル]]

${taskTitle}

[[タスク詳細]]

${taskDesc || "なし"}

[[親カテゴリ]]

${baseCategory?.name || "なし"}

[[親カテゴリ詳細]]

${baseCategory?.description || "なし"}

[[子カテゴリ]]

${subCategory?.name || "なし"}

[[子カテゴリ詳細]]

${subCategory?.description || "なし"}

[[現在のチェックリスト]]

${currentChecklist.map((item) => `- ${item.title}(${item.completed ? "完了" : "未完了"})`).join("\n")}

`.trim();

	const response = await model.generateContent(prompt);
	const text = response.response.text();

	try {
		// Markdownコードブロックが含まれている場合は除去する
		const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
		const jsonStr = jsonMatch ? jsonMatch[1] : text;
		const parsed = JSON.parse(jsonStr.trim());

		// zodを利用して suggestForRefineTask の型チェックを行う
		const schema = z.object({
			checklist: z.array(
				z.object({
					title: z.string(),
					completed: z.boolean().default(false),
				}),
			),
			advice: z.string(),
		});

		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data as SuggestForRefineTask;
		} else {
			console.warn("AI response validation failed:", result.error, parsed);
			// フォールバック: パースに失敗したが、最低限の形式を整えて返す
			return {
				checklist: Array.isArray(parsed?.checklist)
					? parsed.checklist.map((item: any) => ({
							title: typeof item?.title === "string" ? item.title : "No Title",
							completed: false,
						}))
					: [],
				advice:
					typeof parsed?.advice === "string"
						? parsed.advice
						: "アドバイスの生成に失敗しました。",
			};
		}
	} catch (error) {
		console.error("Failed to parse AI checklist response:", error, text);
		throw new Error(
			"AIが予期しない形式で応答しました。JSONとしてパースできませんでした。",
		);
	}
}

export type SuggestForNewTask = {
	title: string;
	description: string;
	checklist: CheckListItem[];
};

export async function suggestTaskFromInbox(
	inboxContent: string,
	userPrompt: string,
): Promise<SuggestForNewTask> {
	if (!ai) {
		throw new Error("Firebase AI is not initialized.");
	}

	const model = getGenerativeModel(ai, {
		model: "gemini-2.5-flash",
	});

	const prompt = `
[依頼内容]
Inboxに保存されたメモ書き（アイテム）と、ユーザーからの補足指示を元に、新しいタスクのドラフトを作成してください。
以下の条件を満たすようにしてください。
- タイトルは具体的で、何をするのか一目でわかるようにする。
- 詳細な説明（description）には、アイテムの内容や補足指示を整理して記載する。
- タスクを達成するために必要な具体的なチェックリスト（サブタスク）を生成する（最大10個程度）。
- 各チェックリストは担当者が能動的に処理でき、具体的でわかりやすく、1つあたり30分以内で終わる程度の粒度にすること。順序も考慮すること。

[期待する出力フォーマット]
返却値は必ずJSON形式のオブジェクトとしてください。オブジェクトは \`title\` (文字列), \`description\` (文字列), \`checklist\` (CheckListItemの配列) を持つオブジェクトとしてください。
Markdownのコードブロック (\`\`\`json ... \`\`\`) は使用せず、純粋なJSON配列文字列のみを出力してください。無理な場合はコードブロックで囲っても構いません。

[出力例]
{
  "title": "〇〇機能の実装",
  "description": "ユーザーからの要望に基づき〇〇機能を実装する。仕様は...\\n補足: ...",
  "checklist": [
    { "title": "要件を整理する", "completed": false },
    { "title": "関連ドキュメントを読む", "completed": false }
  ]
}

[Inboxアイテムの内容]
${inboxContent}

[ユーザーからの補足指示]
${userPrompt || "なし"}
`.trim();

	const response = await model.generateContent(prompt);
	const text = response.response.text();

	try {
		const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
		const jsonStr = jsonMatch ? jsonMatch[1] : text;
		const parsed = JSON.parse(jsonStr.trim());

		const schema = z.object({
			title: z.string(),
			description: z.string(),
			checklist: z.array(
				z.object({
					title: z.string(),
					completed: z.boolean().default(false),
				}),
			),
		});

		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data as SuggestForNewTask;
		} else {
			console.warn("AI response validation failed:", result.error, parsed);
			return {
				title:
					typeof parsed?.title === "string" ? parsed.title : "無題のタスク",
				description:
					typeof parsed?.description === "string" ? parsed.description : "",
				checklist: Array.isArray(parsed?.checklist)
					? parsed.checklist.map((item: any) => ({
							title: typeof item?.title === "string" ? item.title : "No Title",
							completed: false,
						}))
					: [],
			};
		}
	} catch (error) {
		console.error("Failed to parse AI checklist response:", error, text);
		throw new Error(
			"AIが予期しない形式で応答しました。JSONとしてパースできませんでした。",
		);
	}
}

export type SuggestForResearchPlan = {
	title: string;
	content: string;
};

export async function suggestResearchPlan(
	inboxContent: string,
	userPrompt: string,
): Promise<SuggestForResearchPlan> {
	if (!ai) {
		throw new Error("Firebase AI is not initialized.");
	}

	const model = getGenerativeModel(ai, {
		model: "gemini-2.5-flash",
	});

	const prompt = `
[依頼内容]
Inboxに保存されたメモ書き（アイデア）と、ユーザーからの補足指示を元に、調査計画（プロジェクト案）を作成してください。
以下の条件を満たすようにしてください。
- タイトルは具体的で、プロジェクト名として適切なものを提案してください。
- 内容（content）はMarkdown形式で、アイデアを具体化・タスク化するまでの調査ステップ、検討事項、および確認用チェックリスト（Markdownチェックボックス形式: - [ ] ）を含めてください。

[期待する出力フォーマット]
返却値は必ずJSON形式のオブジェクトとしてください。オブジェクトは \`title\` (文字列), \`content\` (Markdown形式の文字列) を持つオブジェクトとしてください。
Markdownのコードブロック (\`\`\`json ... \`\`\`) は使用せず、純粋なJSON文字列のみを出力してください。無理な場合はコードブロックで囲っても構いません。

[出力例]
{
  "title": "〇〇プロジェクトの立ち上げ",
  "content": "# 〇〇プロジェクト調査計画\\n\\n## 概要\\n...\\n\\n## タスク化までの確認リスト\\n- [ ] 要件定義の作成\\n- [ ] 競合調査"
}

[Inboxアイテムの内容]
${inboxContent}

[ユーザーからの補足指示]
${userPrompt || "なし"}
`.trim();

	const response = await model.generateContent(prompt);
	const text = response.response.text();

	try {
		const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
		const jsonStr = jsonMatch ? jsonMatch[1] : text;
		const parsed = JSON.parse(jsonStr.trim());

		const schema = z.object({
			title: z.string(),
			content: z.string(),
		});

		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data as SuggestForResearchPlan;
		} else {
			console.warn("AI response validation failed:", result.error, parsed);
			return {
				title:
					typeof parsed?.title === "string" ? parsed.title : "無題の調査計画",
				content:
					typeof parsed?.content === "string" ? parsed.content : inboxContent,
			};
		}
	} catch (error) {
		console.error("Failed to parse AI research plan response:", error, text);
		throw new Error(
			"AIが予期しない形式で応答しました。JSONとしてパースできませんでした。",
		);
	}
}

export async function refineResearchPlan(
	currentTitle: string,
	currentContent: string,
	userPrompt: string,
): Promise<SuggestForResearchPlan> {
	if (!ai) {
		throw new Error("Firebase AI is not initialized.");
	}

	const model = getGenerativeModel(ai, {
		model: "gemini-2.5-flash",
	});

	const prompt = `
[依頼内容]
現在の調査計画（タイトルとMarkdownの本文）と、ユーザーからの指示（改善プロンプト）を元に、調査計画をアップデート・改善してください。
以下の条件を満たすようにしてください。
- ユーザーの指示（改善プロンプト）を的確に反映し、現在のタイトルや内容を適切に洗練させてください。
- 内容はMarkdown形式で、より詳細で具体的に書き直してください。

[期待する出力フォーマット]
返却値は必ずJSON形式のオブジェクトとしてください。オブジェクトは \`title\` (文字列), \`content\` (Markdown形式の文字列) を持つオブジェクトとしてください。
Markdownのコードブロック (\`\`\`json ... \`\`\`) は使用せず、純粋なJSON文字列のみを出力してください。無理な場合はコードブロックで囲っても構いません。

[現在の調査計画]
タイトル: ${currentTitle}
本文:
${currentContent}

[ユーザーからの指示（改善プロンプト）]
${userPrompt}
`.trim();

	const response = await model.generateContent(prompt);
	const text = response.response.text();

	try {
		const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
		const jsonStr = jsonMatch ? jsonMatch[1] : text;
		const parsed = JSON.parse(jsonStr.trim());

		const schema = z.object({
			title: z.string(),
			content: z.string(),
		});

		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data as SuggestForResearchPlan;
		} else {
			console.warn("AI response validation failed:", result.error, parsed);
			return {
				title: typeof parsed?.title === "string" ? parsed.title : currentTitle,
				content:
					typeof parsed?.content === "string" ? parsed.content : currentContent,
			};
		}
	} catch (error) {
		console.error(
			"Failed to parse AI refined research plan response:",
			error,
			text,
		);
		throw new Error(
			"AIが予期しない形式で応答しました。JSONとしてパースできませんでした。",
		);
	}
}
