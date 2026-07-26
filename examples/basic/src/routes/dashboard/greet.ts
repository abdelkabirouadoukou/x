export const actions = {
  async greet(name: string): Promise<string> {
    return `Hello, ${name}! The server time is ${new Date().toLocaleTimeString()}.`;
  },
};
