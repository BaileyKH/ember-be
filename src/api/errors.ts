

export class BadRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class UserNotAuthenticatedError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class UserForbiddenError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}


export function getDBViolation(err: unknown): string | null {
    const e = err as any;
    const code = e?.cause?.code ?? e?.code;

    if (code !== "23505") return null;

    return e?.cause?.constraint_name ?? e?.contraint_name ?? e?.contraint ?? "";
}