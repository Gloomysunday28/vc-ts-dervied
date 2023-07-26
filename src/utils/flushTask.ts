interface TaskDto {
  (...params: any[]): any
}

class FlushTasks<T extends TaskDto>{
  tasks: T[] = [];
  /**
   * @description 不影响主线程情况下批量执行任务
   */
  flushTasks(): void {
    if (Array.isArray(this.tasks)) {
      let task: T;
      while ((task = this.tasks.shift())) {
        task?.();
        Promise.resolve().then(function() {
        });
      }
    }
  }
  /**
   * @description 添加后续批量执行任务
   * @param task TaskDto
   */
  addTask(task: T): void;
  addTask(task: T) {
    if (!this.tasks.includes(task)) {
      this.tasks.push(task);
    }
  }
  /**
   * @description 清除当前剩余的task
   * @param task TaskDto
  */
  clearTask(): void;
  clearTask() {
    this.tasks.length = 0;
  }
}

export default new FlushTasks();