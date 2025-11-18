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
      push_url: this.config.receiverUrl,
      datasource: [
        {
          type: "file",
          file_patterns: [
            path.resolve(this.config.dataPath) + "/*.jsonl"
          ],
          app_id: this.config.appId,
          http_compress: "gzip"
        }
      ],
      cpu_limit: this.config.cpuLimit || 4
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

      // LogBus2 디렉토리에서 실행 (conf/daemon.json을 찾기 위해)
      const logbusDir = path.dirname(this.config.logbusPath);
      const { stdout, stderr } = await execAsync(`"${this.config.logbusPath}" start`, {
        cwd: logbusDir
      });

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
      const logbusDir = path.dirname(this.config.logbusPath);
      const { stdout } = await execAsync(`"${this.config.logbusPath}" stop`, {
        cwd: logbusDir
      });
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

      // 이전 파일 offset 기록 초기화 (새로운 run 시작 시 필수)
      console.log('🔄 Resetting LogBus2 offset records...');
      await this.reset();

      await this.start();
    } catch (error) {
      console.error('❌ LogBus2 restart failed');
      throw error;
    }
  }

  /**
   * LogBus2 설정 업데이트 (재시작 없이)
   */
  async update(): Promise<void> {
    try {
      const logbusDir = path.dirname(this.config.logbusPath);
      const { stdout } = await execAsync(`"${this.config.logbusPath}" update`, {
        cwd: logbusDir
      });
      console.log('✅ LogBus2 configuration updated');
      console.log(stdout);
    } catch (error: any) {
      console.error('❌ LogBus2 update failed:', error.message);
      throw error;
    }
  }

  /**
   * LogBus2 상태 확인
   */
  async getStatus(): Promise<LogBus2Status> {
    try {
      const logbusDir = path.dirname(this.config.logbusPath);
      const { stdout } = await execAsync(`"${this.config.logbusPath}" progress`, {
        cwd: logbusDir
      });

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
      const logbusDir = path.dirname(this.config.logbusPath);
      const { stdout } = await execAsync(`"${this.config.logbusPath}" reset`, {
        cwd: logbusDir
      });
      console.log('✅ LogBus2 reset completed');
      console.log(stdout);
    } catch (error: any) {
      console.error('❌ LogBus2 reset failed:', error.message);
      throw error;
    }
  }

  /**
   * 완전 초기화: 이전 실행 상태를 완전히 제거하고 새로운 실행 준비
   * - LogBus2 중지
   * - 이전 메타데이터 디렉토리 삭제
   * - 새 app_id를 위한 메타 디렉토리 생성
   * - daemon.json 재생성
   */
  async cleanAndPrepare(): Promise<void> {
    try {
      console.log('🧹 Starting complete LogBus2 cleanup...');

      // 1. LogBus2 중지 (실행 중이지 않아도 에러 무시)
      try {
        await this.stop();
      } catch (error: any) {
        console.log('⚠️ LogBus2 was not running (OK)');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. 기존 메타데이터 디렉토리 모두 삭제
      const logbusDir = path.dirname(this.config.logbusPath);
      const metaDir = path.join(logbusDir, 'runtime', 'meta');

      if (fs.existsSync(metaDir)) {
        console.log(`🗑️ Removing old metadata: ${metaDir}`);
        const oldDirs = fs.readdirSync(metaDir);
        for (const dir of oldDirs) {
          const dirPath = path.join(metaDir, dir);
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`   - Removed: ${dir}`);
        }
      }

      // 3. 새 app_id를 위한 메타 디렉토리 생성
      const newMetaDir = path.join(metaDir, this.config.appId);
      fs.mkdirSync(newMetaDir, { recursive: true });
      console.log(`✅ Created fresh metadata directory for app_id: ${this.config.appId}`);

      // 4. daemon.json 재생성 (새로운 경로와 app_id로)
      await this.createDaemonConfig();
      console.log('✅ daemon.json updated with new configuration');

      console.log('✅ LogBus2 cleanup and preparation completed');
    } catch (error: any) {
      console.error('❌ LogBus2 cleanup failed:', error.message);
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
