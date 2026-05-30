import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	type QueryConstraint,
	query,
	serverTimestamp,
	Timestamp,
	type Unsubscribe,
	updateDoc,
	where,
} from "firebase/firestore";
import { db } from "./firebase";

// ────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────

export type TodoStatus = "OPEN" | "PENDING" | "COMPLETED";
export type CategoryStatus = "ACTIVE" | "ARCHIVED";

export interface CheckListItem {
	title: string;
	completed: boolean;
}

export interface Todo {
	id: string;
	title: string;
	status: TodoStatus;
	until_date: Date | null;
	description: string | null;
	check_list: CheckListItem[] | null;
	categoryId: string | null;
	parentCategoryId: string | null;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	// リレーション（クライアントで結合）
	category?: Category | null;
	parentCategory?: Category | null;
}

export interface Category {
	id: string;
	name: string;
	description: string | null;
	status: CategoryStatus;
	parentId: string | null;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	// リレーション
	children?: Category[];
	parent?: Category | null;
	todoCount?: number;
}

export type InboxAnnotation = "DO" | "WAIT" | "MEMO" | "SEED" | "DONE" | "NONE";

export interface InboxItem {
	id: string;
	content: string;
	annotation: InboxAnnotation;
	userId: string;
	isProcessed: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface ResearchPlan {
	id: string;
	title: string;
	content: string;
	userId: string;
	inboxItemId?: string;
	createdAt: Date;
	updatedAt: Date;
}

// ────────────────────────────────────────────────
// Firestoreのデータ変換ヘルパー
// ────────────────────────────────────────────────

function toDate(value: Timestamp | Date | null | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Timestamp) return value.toDate();
	return value as Date;
}

function toTimestamp(date: Date | null | undefined): Timestamp | null {
	if (!date) return null;
	return Timestamp.fromDate(date);
}

// ────────────────────────────────────────────────
// コレクション参照
// ────────────────────────────────────────────────

const todosCol = collection(db, "todos");
const categoriesCol = collection(db, "categories");
const inboxItemsCol = collection(db, "inbox_items");
const researchPlansCol = collection(db, "research_plans");

// ────────────────────────────────────────────────
// Todo リアルタイム購読
// ────────────────────────────────────────────────

export interface TodoFilters {
	startDate: Date;
	endDate: Date;
	maxLimit: number;
}

/**
 * Todoをリアルタイム購読する。
 * Firestoreの制約上、「until_dateが範囲内」と「until_date=null」の
 * ORクエリは2つのクエリに分けてクライアント側でマージする。
 */
export function subscribeTodos(
	userId: string,
	filters: TodoFilters,
	onData: (todos: Todo[]) => void,
	onError?: (err: Error) => void,
): Unsubscribe {
	const { startDate, endDate, maxLimit } = filters;

	let todosWithDate: Todo[] = [];
	let todosWithoutDate: Todo[] = [];

	const merge = () => {
		// until_dateでソート(nullは末尾)、次にcreatedAt降順
		const all = [...todosWithDate, ...todosWithoutDate]
			.sort((a, b) => {
				if (a.until_date && b.until_date) {
					return a.until_date.getTime() - b.until_date.getTime();
				}
				if (a.until_date && !b.until_date) return -1;
				if (!a.until_date && b.until_date) return 1;
				return b.createdAt.getTime() - a.createdAt.getTime();
			})
			.slice(0, maxLimit);
		onData(all);
	};

	// クエリ1: until_dateが指定期間内のTodo
	const qWithDate = query(
		todosCol,
		where("userId", "==", userId),
		where("until_date", ">=", Timestamp.fromDate(startDate)),
		where("until_date", "<=", Timestamp.fromDate(endDate)),
		orderBy("until_date", "asc"),
		orderBy("createdAt", "desc"),
		limit(maxLimit),
	);

	// クエリ2: until_dateがnullのTodo（今日が期間内の場合のみ表示）
	const today = new Date();
	const includesToday = startDate <= today && today <= endDate;

	const unsubDate = onSnapshot(
		qWithDate,
		(snap) => {
			todosWithDate = snap.docs.map((d) => docToTodo(d.id, d.data()));
			merge();
		},
		(err) => onError?.(err),
	);

	let unsubNull: Unsubscribe = () => {};

	if (includesToday) {
		const qWithoutDate = query(
			todosCol,
			where("userId", "==", userId),
			where("until_date", "==", null),
			orderBy("createdAt", "desc"),
			limit(maxLimit),
		);

		unsubNull = onSnapshot(
			qWithoutDate,
			(snap) => {
				todosWithoutDate = snap.docs.map((d) => docToTodo(d.id, d.data()));
				merge();
			},
			(err) => onError?.(err),
		);
	}

	return () => {
		unsubDate();
		unsubNull();
	};
}

function docToTodo(id: string, data: Record<string, unknown>): Todo {
	return {
		id,
		title: data.title as string,
		status: data.status as TodoStatus,
		until_date: toDate(data.until_date as Timestamp | null),
		description: (data.description as string | null) ?? null,
		check_list: (data.check_list as CheckListItem[] | null) ?? null,
		categoryId: (data.categoryId as string | null) ?? null,
		parentCategoryId: (data.parentCategoryId as string | null) ?? null,
		userId: data.userId as string,
		createdAt: toDate(data.createdAt as Timestamp) || new Date(),
		updatedAt: toDate(data.updatedAt as Timestamp) || new Date(),
	};
}

// ────────────────────────────────────────────────
// Todo CRUD
// ────────────────────────────────────────────────

export interface CreateTodoInput {
	title: string;
	description?: string | null;
	until_date?: Date | null;
	categoryId?: string | null;
	parentCategoryId?: string | null;
	check_list?: CheckListItem[];
}

export async function createTodo(
	userId: string,
	input: CreateTodoInput,
): Promise<void> {
	await addDoc(todosCol, {
		title: input.title,
		status: "OPEN",
		until_date: toTimestamp(input.until_date ?? null),
		description: input.description ?? null,
		check_list: input.check_list ?? null,
		categoryId: input.categoryId ?? null,
		parentCategoryId: input.parentCategoryId ?? null,
		userId,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
}

export interface UpdateTodoInput {
	title?: string;
	description?: string | null;
	until_date?: Date | null;
	categoryId?: string | null;
	parentCategoryId?: string | null;
	check_list?: CheckListItem[] | null;
	status?: TodoStatus;
}

export async function updateTodo(
	todoId: string,
	input: UpdateTodoInput,
): Promise<void> {
	const ref = doc(db, "todos", todoId);
	const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

	if (input.title !== undefined) data.title = input.title;
	if (input.description !== undefined) data.description = input.description;
	if (input.until_date !== undefined)
		data.until_date = toTimestamp(input.until_date);
	if (input.categoryId !== undefined) data.categoryId = input.categoryId;
	if (input.parentCategoryId !== undefined)
		data.parentCategoryId = input.parentCategoryId;
	if (input.check_list !== undefined) data.check_list = input.check_list;
	if (input.status !== undefined) data.status = input.status;

	await updateDoc(ref, data);
}

export async function setTodoStatus(
	todo: Todo,
	newStatus: TodoStatus,
): Promise<void> {
	if (todo.status === newStatus) return;
	await updateTodo(todo.id, { status: newStatus });

	if (newStatus === "COMPLETED") {
		await createInboxItem(todo.userId, {
			content: todo.title,
			annotation: "DONE",
			isProcessed: true,
		});
	}
}

// ────────────────────────────────────────────────
// Category リアルタイム購読
// ────────────────────────────────────────────────

export function subscribeCategories(
	userId: string,
	onData: (categories: Category[]) => void,
	onError?: (err: Error) => void,
): Unsubscribe {
	const q = query(categoriesCol, where("userId", "==", userId));

	return onSnapshot(
		q,
		(snap) => {
			const categories = snap.docs.map((d) => docToCategory(d.id, d.data()));
			categories.sort((a, b) => a.name.localeCompare(b.name));
			// クライアントサイドでchildren/parentを結合
			const withRelations = buildCategoryRelations(categories);
			onData(withRelations);
		},
		(err) => onError?.(err),
	);
}

function docToCategory(id: string, data: Record<string, unknown>): Category {
	return {
		id,
		name: data.name as string,
		description: (data.description as string | null) ?? null,
		status: data.status as CategoryStatus,
		parentId: (data.parentId as string | null) ?? null,
		userId: data.userId as string,
		createdAt: toDate(data.createdAt as Timestamp) || new Date(),
		updatedAt: toDate(data.updatedAt as Timestamp) || new Date(),
	};
}

function buildCategoryRelations(categories: Category[]): Category[] {
	const map = new Map(
		categories.map((c) => [c.id, { ...c, children: [] as Category[] }]),
	);

	for (const cat of map.values()) {
		if (cat.parentId) {
			const parent = map.get(cat.parentId);
			if (parent) {
				cat.parent = parent;
				parent.children = parent.children ?? [];
				parent.children.push(cat);
			}
		}
	}

	return Array.from(map.values());
}

// ────────────────────────────────────────────────
// Category CRUD
// ────────────────────────────────────────────────

export interface CreateCategoryInput {
	name: string;
	description?: string | null;
	parentId?: string | null;
}

export async function createCategory(
	userId: string,
	input: CreateCategoryInput,
): Promise<void> {
	await addDoc(categoriesCol, {
		name: input.name,
		description: input.description ?? null,
		parentId: input.parentId ?? null,
		status: "ACTIVE",
		userId,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
}

export interface UpdateCategoryInput {
	name?: string;
	description?: string | null;
	parentId?: string | null;
	status?: CategoryStatus;
}

export async function updateCategory(
	categoryId: string,
	input: UpdateCategoryInput,
): Promise<void> {
	const ref = doc(db, "categories", categoryId);
	const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

	if (input.name !== undefined) data.name = input.name;
	if (input.description !== undefined) data.description = input.description;
	if (input.parentId !== undefined) data.parentId = input.parentId;
	if (input.status !== undefined) data.status = input.status;

	await updateDoc(ref, data);
}

export async function toggleCategoryStatus(category: Category): Promise<void> {
	const newStatus: CategoryStatus =
		category.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
	await updateCategory(category.id, { status: newStatus });
}

// ────────────────────────────────────────────────
// InboxItem CRUD
// ────────────────────────────────────────────────

export interface CreateInboxItemInput {
	content: string;
	annotation: InboxAnnotation;
	isProcessed?: boolean;
}

export async function createInboxItem(
	userId: string,
	input: CreateInboxItemInput,
): Promise<void> {
	await addDoc(inboxItemsCol, {
		content: input.content,
		annotation: input.annotation,
		isProcessed: input.isProcessed ?? false,
		userId,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
}

export interface UpdateInboxItemInput {
	content?: string;
	annotation?: InboxAnnotation;
	isProcessed?: boolean;
}

export async function updateInboxItem(
	itemId: string,
	input: UpdateInboxItemInput,
): Promise<void> {
	const ref = doc(db, "inbox_items", itemId);
	const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

	if (input.content !== undefined) data.content = input.content;
	if (input.annotation !== undefined) data.annotation = input.annotation;
	if (input.isProcessed !== undefined) data.isProcessed = input.isProcessed;

	await updateDoc(ref, data);
}

export async function deleteInboxItem(itemId: string): Promise<void> {
	const ref = doc(db, "inbox_items", itemId);
	await deleteDoc(ref);
}

export function subscribeInboxItems(
	userId: string,
	onData: (items: InboxItem[]) => void,
	onError?: (err: Error) => void,
): Unsubscribe {
	const q = query(
		inboxItemsCol,
		where("userId", "==", userId),
		orderBy("createdAt", "desc"),
		limit(500),
	);

	return onSnapshot(
		q,
		(snap) => {
			const items = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					content: data.content as string,
					annotation: data.annotation as InboxAnnotation,
					isProcessed:
						data.isProcessed === undefined
							? data.annotation === "DONE"
							: (data.isProcessed as boolean),
					userId: data.userId as string,
					createdAt: toDate(data.createdAt as Timestamp) || new Date(),
					updatedAt: toDate(data.updatedAt as Timestamp) || new Date(),
				};
			});
			onData(items);
		},
		(err) => onError?.(err),
	);
}

// ────────────────────────────────────────────────
// ResearchPlan CRUD
// ────────────────────────────────────────────────

export interface CreateResearchPlanInput {
	title: string;
	content: string;
	inboxItemId?: string;
}

export async function createResearchPlan(
	userId: string,
	input: CreateResearchPlanInput,
): Promise<string> {
	const docRef = await addDoc(researchPlansCol, {
		title: input.title,
		content: input.content,
		inboxItemId: input.inboxItemId ?? null,
		userId,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return docRef.id;
}

export interface UpdateResearchPlanInput {
	title?: string;
	content?: string;
}

export async function updateResearchPlan(
	planId: string,
	input: UpdateResearchPlanInput,
): Promise<void> {
	const ref = doc(db, "research_plans", planId);
	const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

	if (input.title !== undefined) data.title = input.title;
	if (input.content !== undefined) data.content = input.content;

	await updateDoc(ref, data);
}

export async function deleteResearchPlan(planId: string): Promise<void> {
	const ref = doc(db, "research_plans", planId);
	await deleteDoc(ref);
}

export function subscribeResearchPlans(
	userId: string,
	onData: (plans: ResearchPlan[]) => void,
	onError?: (err: Error) => void,
): Unsubscribe {
	const q = query(
		researchPlansCol,
		where("userId", "==", userId),
		orderBy("createdAt", "desc"),
	);

	return onSnapshot(
		q,
		(snap) => {
			const plans = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					title: data.title as string,
					content: data.content as string,
					userId: data.userId as string,
					inboxItemId: (data.inboxItemId as string | null) ?? undefined,
					createdAt: toDate(data.createdAt as Timestamp) || new Date(),
					updatedAt: toDate(data.updatedAt as Timestamp) || new Date(),
				};
			});
			onData(plans);
		},
		(err) => onError?.(err),
	);
}
