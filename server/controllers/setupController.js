const { exec, execSync, spawn, spawnSync } = require('child_process');

const setupController = {};


// helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
// helm repo update
// helm install prometheus prometheus-community/kube-prometheus-stack
// kubectl port-forward prometheus-grafana-5f98c899f8-tv8gp 3001:3000
setupController.promInit = () => {
  spawnSync('helm repo add prometheus-community https://prometheus-community.github.io/helm-charts', {
    stdio: 'inherit',
    shell: true,
  });
  spawnSync('helm repo update', {
    stdio: 'inherit',
    shell: true,
  });
  spawnSync('helm install prometheus prometheus-community/kube-prometheus-stack', {
    stdio: 'inherit',
    shell: true,
  });
};

setupController.grafEmbed = async () => {
  let podName;
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
  // spawnSync('kubectl apply -f prometheus-grafana.yaml', {
  //   stdio: 'inherit',
  //   shell: true
  // });
  // execSync(`kubectl delete pod ${podName}`, {
  //   // stdio: 'inherit',
  //   // shell: true
  // });
  getter.once('close', () => {
    spawnSync('kubectl apply -f prometheus-grafana.yaml', {
      stdio: 'inherit',
      shell: true
    });
    spawnSync(`kubectl delete pod ${podName}`, {
      stdio: 'inherit',
      shell: true,
    });
    setupController.forwardPort();
  });
};

setupController.forwardPort = () => {
  let podName;
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

  getter.on('close', () => {
    const grafana = spawn(`kubectl port-forward ${podName} 3001:3000`, {
      shell: true,
    });

    grafana.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    grafana.stderr.on('data', (data) => {
      console.error(`stderr in grafana: ${data}`);
    });

    grafana.on('exit', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  });
};

module.exports = setupController;

// setupController.promInit();