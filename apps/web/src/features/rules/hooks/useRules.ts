import { useMutation, useQuery } from "urql";
import {
	CREATE_FILE_RULE_MUTATION,
	DELETE_FILE_RULE_MUTATION,
	FILE_RULES_QUERY,
	REORDER_FILE_RULES_MUTATION,
	UPDATE_FILE_RULE_MUTATION,
} from "../api/rule";

export function useFileRules() {
	const [result, reexecute] = useQuery({
		query: FILE_RULES_QUERY,
	});
	return [result, reexecute] as const;
}

export function useCreateFileRule() {
	const [result, execute] = useMutation(CREATE_FILE_RULE_MUTATION);
	return [result, execute] as const;
}

export function useUpdateFileRule() {
	const [result, execute] = useMutation(UPDATE_FILE_RULE_MUTATION);
	return [result, execute] as const;
}

export function useDeleteFileRule() {
	const [result, execute] = useMutation(DELETE_FILE_RULE_MUTATION);
	return [result, execute] as const;
}

export function useReorderFileRules() {
	const [result, execute] = useMutation(REORDER_FILE_RULES_MUTATION);
	return [result, execute] as const;
}
