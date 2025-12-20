{ pkgs, ... }:

{
  # Define the packages available in your development environment
  packages = [
    pkgs.nodejs_20  # For Node.js and npm, common for Next.js projects
    pkgs.docker     # Docker CLI and daemon
    # You can add other development tools here, for example:
    # pkgs.git
    # pkgs.yarn
  ];

  # Commands to run when entering the shell
  enterShell = ''
    echo "Welcome to your Nix development environment!"
    echo "Node.js, npm, and Docker are available."
    node --version
    npm --version
    docker --version || echo "Docker daemon might not be running. Start it if needed."
  '';

  # You can define environment variables here if needed
  # env = {
  #   MY_VARIABLE = "hello";
  # };

  # Scripts available in the shell
  # scripts = {
  #   hello = {
  #     exec = "echo hello from devenv";
  #   };
  # };
}
