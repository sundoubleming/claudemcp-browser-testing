declare module 'chrome-remote-interface' {
  function CDP(options?: any): Promise<CDP.Client>;
  namespace CDP {
    function List(options?: any): Promise<any[]>;
    function Version(options?: any): Promise<any>;
    interface Client {
      Runtime: any;
      Network: any;
      Page: any;
      on(event: string, callback: (...args: any[]) => void): void;
      close(): Promise<void>;
    }
  }
  export = CDP;
}
