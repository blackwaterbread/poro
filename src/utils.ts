export function sum(array: number[]): number {
    return array.reduce((a, b) => a + b);
}

export function getRemains(n: number) {
    const remain = n % 0x10;
    return remain === 0x00 ? remain : 0x10 - remain;
}