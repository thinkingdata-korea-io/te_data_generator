import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * LogBus2 설정
 */
export interface LogBus2Config {
  appId: string;
  receiverUrl: string;
  logbusPath: string;
  dataPath: string;
  cpuLimit?: number;
  compress?: boolean;
}

/**
 * LogBus2 상태
 */
export interface LogBus2Status {
  isRunning: boolean;
  uploadedFiles?: number;
  totalFiles?: number;
  progress?: number;
}

/**
 * LogBus2 컨트롤러
 */
export class LogBus2Controller {
  private config: LogBus2Config;
  private daemonConfigPath: string;

  constructor(config: LogBus2Config) {
    this.config = config;

    // LogBus2 디렉토리에서 conf 경로 설정
    const logbusDir = path.dirname(this.config.logbusPath);
    this.daemonConfigPath = path.join(logbusDir, 'conf', 'daemon.json');
  }

  /**
   * daemon.json 설정 파일 생성
   */
  async createDaemonConfig(): Promise<void> {
    const config = {
      config_id: 1,
      app_id: this.config.appId,
      url: this.config.receiverUrl,
      mode: 2, // 실시간 모드
      compress: this.config.compress !== false ? 1 : 0,
      batchs: [
        {
          batch_id: 1,
          token: this.config.appId,
          dir: path.resolve(this.config.dataPath),
          pattern: "*.jsonl",
          auto_retry: true,
          file_suffix: ".sending"
        }
      ],
      max_file_size: 2048,
      upload_interval: 1,
      max_cache_lines: 10000,
      max_sending_cnt: 3
    };

    // conf 디렉토리 생성
    const confDir = path.dirname(this.daemonConfigPath);
    if (!fs.existsSync(confDir)) {
      fs.mkdirSync(confDir, { recursive: true });
    }

    // daemon.json 작성
    fs.writeFileSync(
      this.daemonConfigPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    console.log(`✅ daemon.json created: ${this.daemonConfigPath}`);
  }

  /**
   * 설정 검증
   */
  async validateConfig(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`"${this.config.logbusPath}" env`);
      console.log('LogBus2 환경 확인:', stdout);
      return true;
    } catch (error: any) {
      console.error('LogBus2 환경 확인 실패:', error.message);
      return false;
    }
  }

  /**
   * LogBus2 시작
   */
  async start(): Promise<void> {
    try {
      // CPU 제한 설정
      if (this.config.cpuLimit) {
        process.env.LOGBUS_CPU_LIMIT = String(this.config.cpuLimit);
      }

      const { stdout, stderr } = await execAsync(`"${this.config.logbusPath}" start`);

      if (stderr && !stderr.includes('success')) {
        console.warn('LogBus2 start warning:', stderr);
      }

      console.log('✅ LogBus2 started');
      console.log(stdout);
    } catch (error: any) {
      console.error('❌ LogBus2 start failed:', error.message);
      throw error;
    }
  }

  /**
   * LogBus2 중지
   */
  async stop(): Promise<void> {
    try {
      const { stdout } = await execAsync(`"${this.config.logbusPath}" stop`);
      console.log('✅ LogBus2 stopped');
      console.log(stdout);
    } catch (error: any) {
      console.error('❌ LogBus2 stop failed:', error.message);
      throw error;
    }
  }

  /**
   * LogBus2 재시작
   */
  async restart(): Promise<void> {
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      await this.start();
    } catch (error) {
      console.error('❌ LogBus2 restart failed');
      throw error;
    }
  }

  /**
   * LogBus2 상태 확인
   */
  async getStatus(): Promise<LogBus2Status> {
    try {
      const { stdout } = await execAsync(`"${this.config.logbusPath}" progress`);

      // progress 출력 파싱
      const isRunning = !stdout.includes('not running');

      // 파일 카운트 파싱 (예: "2/10 files uploaded")
      const match = stdout.match(/(\d+)\/(\d+)/);

      if (match) {
        const uploaded = parseInt(match[1]);
        const total = parseInt(match[2]);
        const progress = total > 0 ? (uploaded / total) * 100 : 0;

        return {
          isRunning,
          uploadedFiles: uploaded,
          totalFiles: total,
          progress
        };
      }

      return { isRunning };
    } catch (error: any) {
      return { isRunning: false };
    }
  }

  /**
   * 진행 상태 모니터링
   */
  async monitorProgress(
    intervalSeconds: number = 5,
    onProgress?: (status: LogBus2Status) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const status = await this.getStatus();

          if (onProgress) {
            onProgress(status);
          }

          console.log(
            `📊 Progress: ${status.uploadedFiles || 0}/${status.totalFiles || 0} files ` +
            `(${(status.progress || 0).toFixed(1)}%)`
          );

          // 모든 파일 업로드 완료
          if (
            status.totalFiles &&
            status.uploadedFiles === status.totalFiles &&
            status.uploadedFiles > 0
          ) {
            clearInterval(interval);
            console.log('✅ All files uploaded successfully');
            resolve();
          }

          // LogBus2가 중지됨
          if (!status.isRunning && status.totalFiles === 0) {
            clearInterval(interval);
            resolve();
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, intervalSeconds * 1000);
    });
  }

  /**
   * 읽기 기록 초기화
   */
  async reset(): Promise<void> {
    try {
      const { stdout } = await execAsync(`"${this.config.logbusPath}" reset`);
      console.log('✅ LogBus2 reset completed');
      console.log(stdout);
    } catch (error: any) {
      console.error('❌ LogBus2 reset failed:', error.message);
      throw error;
    }
  }

  /**
   * daemon.json 경로 반환
   */
  getDaemonConfigPath(): string {
    return this.daemonConfigPath;
  }
}
