export class BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        throw new Error("run() must be implemented by subclass");
    }
}
