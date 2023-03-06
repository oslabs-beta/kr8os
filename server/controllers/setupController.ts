import { exec, execSync, spawn, spawnSync } from 'child_process';
import { Request, Response, NextFunction, RequestHandler } from 'express';

type Controller = {
  promInit?: RequestHandler;
  grafEmbed?: RequestHandler;
  forwardPort?: RequestHandler;
};
const setupController : Controller = {};

// helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
// helm repo update
// helm install prometheus prometheus-community/kube-prometheus-stack
// kubectl port-forward prometheus-grafana-5f98c899f8-tv8gp 3001:3000
setupController.promInit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('\n\nPrometheus Setup Starting\n\n');

  spawnSync(
    'helm repo add prometheus-community https://prometheus-community.github.io/helm-charts',
    {
      stdio: 'inherit',
      shell: true,
    }
  );
  spawnSync('helm repo update', {
    stdio: 'inherit',
    shell: true,
  });
  spawnSync(
    'helm install prometheus prometheus-community/kube-prometheus-stack',
    {
      stdio: 'inherit',
      shell: true,
    }
  );
  return next();
};

setupController.grafEmbed = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('\n\nGrafana Setup Starting\n\n');
  let podName: any;
  const getter = exec('kubectl get pods', (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    const output = stdout.split('\n');
    output.forEach((line) => {
      if (line.includes('prometheus-grafana')) {
        [podName] = line.split(' ');
      }
    });

    console.log(podName);
  });

  // kubectl replace -f prometheus-grafana.yaml
  // execSync(`kubectl delete pod ${podName}`, {
  //   // stdio: 'inherit',
  //   // shell: true
  // });
  getter.once('close', () => {
    spawnSync('kubectl apply -f prometheus-grafana.yaml', {
      stdio: 'inherit',
      shell: true,
    });
    spawnSync(`kubectl delete pod ${podName}`, {
      stdio: 'inherit',
      shell: true,
    });
    // setupController.forwardPort();
    return next();
  });
};

setupController.forwardPort = (req, res, next) => {
  console.log('\n\nForwarding Port\n\n');
  let podName;
  let podStatus;
  while (podStatus !== 'Running') {
    const abc = execSync('kubectl get pods');
    abc
      .toString()
      .split('\n')
      .forEach((line) => {
        if (line.includes('prometheus-grafana')) {
          if (line.includes('Running')) {
            podStatus = 'Running';
          }
          [podName] = line.split(' ');
          console.log(podName);
        }
      });
  }

  const grafana = spawn(`kubectl port-forward ${podName} 3001:3000`, {
    shell: true,
    // detached: true,
  });
  // grafana.unref();
  grafana.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  grafana.stderr.on('data', (data) => {
    console.error(`stderr in grafana: ${data}`);
  });

  grafana.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
  });
  return next();
};
// });
export default setupController;

// setupController.promInit();
// setupController.grafEmbed();