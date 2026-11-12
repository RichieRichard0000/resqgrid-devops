import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#64748b'))
        
        # Running Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 755, 'RESQGRID DEVOPS ENGINEERING — MENTOR PRESENTATION & PROOF MANUAL')
            self.setFont('Helvetica', 7)
            self.drawRightString(572, 755, 'SRMIST CSE FINAL YEAR PROJECT | PROF. EVALUATION')
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.6)
            self.line(40, 747, 572, 747)

        # Running Footer (All pages)
        self.setFont('Helvetica', 7)
        self.setFillColor(colors.HexColor('#64748b'))
        self.drawString(40, 26, 'Confidential & Academic Defense Guide | Repository: github.com/RichieRichard0000/resqgrid-devops')
        page_text = f'Page {self._pageNumber} of {page_count}'
        self.drawRightString(572, 26, page_text)
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(0.6)
        self.line(40, 34, 572, 34)
        self.restoreState()

def build_pdf(filename="DevOps_Project_Mentor_Proof_and_Defense_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=38,
        rightMargin=38,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=8
    )
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=14.5,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=7,
        spaceAfter=4,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor('#334155')
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f172a')
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=table_cell,
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.white
    )
    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # =========================================================================
    # PAGE 1: Title, Metadata Box, 1. Executive Roadmap, 2. Git & Version Control
    # =========================================================================
    story.append(Paragraph("ResQGrid: Complete DevOps Engineering & Defense Guide", title_style))
    story.append(Paragraph("Step-by-Step Mentor Presentation, File Reference, & Live Verification Manual | SRMIST CSE", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor('#2563eb'), spaceAfter=6))

    # Metadata Box
    meta_data = [
        [
            Paragraph("<b>Target System:</b> ResQGrid (Disaster Platform)", table_cell),
            Paragraph("<b>Live Web Endpoint:</b> http://16.4.118.98", table_cell),
            Paragraph("<b>Kubernetes Cluster:</b> k3s v1.28+ (ap-south-1)", table_cell)
        ],
        [
            Paragraph("<b>GitHub Repo:</b> github.com/RichieRichard0000/resqgrid-devops", table_cell),
            Paragraph("<b>CI/CD Engine:</b> Jenkins LTS (Port 8080)", table_cell),
            Paragraph("<b>Observability:</b> Prometheus & Grafana (9090 / 3000)", table_cell)
        ],
        [
            Paragraph("<b>Latest Release:</b> v2.0.0 (Production Observability)", table_cell),
            Paragraph("<b>Alertmanager:</b> Gmail SMTP Relay Active", table_cell),
            Paragraph("<b>Security Gates:</b> Trivy + OWASP + TypeScript Strict", table_cell)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[185, 175, 176])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # Section 1: Executive Presentation Roadmap
    story.append(Paragraph("1. Executive Presentation Roadmap (12-Minute Mentor Walkthrough)", h1_style))
    story.append(Paragraph(
        "Follow this exact sequence when presenting to your mentor or evaluators. Each phase pairs a core DevOps discipline with the exact file to open, URL to visit, or terminal command to execute.",
        body_style
    ))

    flow_data = [
        [Paragraph("Time / Phase", table_header), Paragraph("DevOps Domain", table_header), Paragraph("What to Show / Open", table_header), Paragraph("Key Mentor Proof Point", table_header)],
        [
            Paragraph("00:00 - 02:00", table_cell_bold),
            Paragraph("Git & Version Control", table_cell_bold),
            Paragraph("GitHub Releases & PR #1<br/><code>git log --graph --oneline</code>", table_cell),
            Paragraph("4-version lifecycle: IaC (v1.0.0) -> Ansible (v1.1.0) -> Failed Quality Gate (v1.2.0-rc1) -> Observability (v2.0.0).", table_cell)
        ],
        [
            Paragraph("02:00 - 04:00", table_cell_bold),
            Paragraph("Terraform (IaC Day-0)", table_cell_bold),
            Paragraph("<code>infra/terraform/compute.tf</code><br/><code>infra/terraform/security_groups.tf</code>", table_cell),
            Paragraph("Clean separation of concerns: Stripped 128 lines of monolithic cloud-init to prevent accidental EC2 destruction.", table_cell)
        ],
        [
            Paragraph("04:00 - 06:00", table_cell_bold),
            Paragraph("Ansible (Config Mgmt)", table_cell_bold),
            Paragraph("<code>ansible/playbooks/site.yml</code><br/><code>ansible -m ping all</code>", table_cell),
            Paragraph("Modular idempotent roles (common, docker, verification). Automated OS baseline & runtime assertions.", table_cell)
        ],
        [
            Paragraph("06:00 - 08:00", table_cell_bold),
            Paragraph("CI/CD Pipeline", table_cell_bold),
            Paragraph("<code>Jenkinsfile</code> (15 stages)<br/>Jenkins UI: <code>http://16.4.118.98:8080</code>", table_cell),
            Paragraph("Automated build, test, lint, container scanning, and Blue-Green release orchestration with automatic rollback.", table_cell)
        ],
        [
            Paragraph("08:00 - 10:00", table_cell_bold),
            Paragraph("Docker & Kubernetes", table_cell_bold),
            Paragraph("<code>kubectl get pods -n resqgrid</code><br/><code>kubectl get svc,ingress,hpa</code>", table_cell),
            Paragraph("k3s lightweight cluster: 6 pods, 5 ClusterIP services, unified Traefik Ingress routing, and HPA auto-scaling.", table_cell)
        ],
        [
            Paragraph("10:00 - 12:00", table_cell_bold),
            Paragraph("Observability & Security", table_cell_bold),
            Paragraph("Prometheus (:9090), Grafana (:3000)<br/>Alertmanager email proof in Gmail", table_cell),
            Paragraph("Live alert rules (5 prescribed rules), verified email dispatch to admin, and memory-safe DevSecOps (Trivy + OWASP).", table_cell)
        ]
    ]
    t_flow = Table(flow_data, colWidths=[65, 85, 175, 211])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 6))

    # Section 2: Git & Version Control
    story.append(Paragraph("2. Git & Version Control Implementation", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> Git 2.40+, GitHub Public Repository (<code>RichieRichard0000/resqgrid-devops</code>), GitHub CLI (<code>gh</code>), Semantic Versioning (SemVer 2.0), Feature Branching (<code>feature/security-and-monitoring</code>), and Pull Request Reviews.<br/>"
        "<b>Why Used & Alternatives:</b> Provides immutable commit auditing, collaborative code reviews, automated CI triggers via webhooks, and explicit rollback checkpoints. Alternatives: GitLab (requires 4-8 GB RAM daemon on host), Bitbucket, SVN (centralized SPOF). GitHub was chosen for zero host resource consumption, native PR ergonomics, and ubiquitous industry adoption.",
        body_style
    ))

    v_data = [
        [Paragraph("Tag / Version", table_header), Paragraph("Commit SHA", table_header), Paragraph("Role in Project Evolution", table_header), Paragraph("Proof to Show Mentor", table_header)],
        [
            Paragraph("<b>v1.0.0</b>", table_cell),
            Paragraph("<code>546cae7</code>", table_cell),
            Paragraph("Infrastructure as Code: Baseline Terraform provisioning of AWS VPC, Subnets, and EC2.", table_cell),
            Paragraph("GitHub Release v1.0.0; <code>infra/terraform/</code> directory.", table_cell)
        ],
        [
            Paragraph("<b>v1.1.0</b>", table_cell),
            Paragraph("<code>89f34c6</code>", table_cell),
            Paragraph("Configuration Management: Stripped cloud-init, introduced modular Ansible roles and inventory.", table_cell),
            Paragraph("GitHub Release v1.1.0; <code>ansible/</code> directory structure.", table_cell)
        ],
        [
            Paragraph("<b>v1.2.0-rc1</b><br/><font color='#b91c1c'><b>[FAILED]</b></font>", table_cell),
            Paragraph("<code>8a8016a</code>", table_cell),
            Paragraph("Simulated Pipeline Failure: SonarQube quality gate threshold breached, blocking deployment.", table_cell),
            Paragraph("File: <code>docs/failures/build-fail-sonarqube-qualitygate.log</code> and pre-release tag.", table_cell)
        ],
        [
            Paragraph("<b>v2.0.0</b><br/><font color='#047857'><b>[LATEST]</b></font>", table_cell),
            Paragraph("<code>2c38190</code>", table_cell),
            Paragraph("Production Release: PR #1 merged. Full observability (Prometheus/Grafana/Alertmanager) & memory-safe SAST.", table_cell),
            Paragraph("GitHub Release v2.0.0; Merged PR #1 web page.", table_cell)
        ]
    ]
    t_v = Table(v_data, colWidths=[65, 55, 235, 181])
    t_v.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_v)
    story.append(Spacer(1, 4))

    git_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>GitHub URL:</b> <code>https://github.com/RichieRichard0000/resqgrid-devops/releases</code> (show all 4 tags with release notes). "
            "2. <b>Pull Request:</b> <code>https://github.com/RichieRichard0000/resqgrid-devops/pull/1</code> (show formal PR merge into <code>main</code>). "
            "3. <b>Terminal Command:</b> <code>git log --graph --oneline --decorate -n 8</code> (show graphical branching & merging topology live).",
            callout_text
        )]
    ]
    t_gp = Table(git_proof, colWidths=[536])
    t_gp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_gp)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: Section 3: CI/CD Pipeline & Section 4: Terraform (IaC Day-0)
    # =========================================================================
    story.append(Paragraph("3. CI/CD Automation (Jenkins Pipeline & Blue-Green Rollout)", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> Jenkins LTS running in Docker on host (Port 8080), Declarative Groovy <code>Jenkinsfile</code> containing 15 automated stages, JUnit XML reporter, Aqua Trivy scanner, OWASP Dependency-Check plugin.<br/>"
        "<b>Why Used & Alternatives:</b> Executes multi-stage CI verification inside our private AWS VPC without exposing Kubernetes API tokens or database credentials to third-party public cloud runners. Alternatives: GitHub Actions (would require exposing self-hosted runner or k8s cluster ingress to public webhooks), GitLab CI, ArgoCD (focused on CD GitOps rather than unified CI build + test).",
        body_style
    ))

    stages_data = [
        [Paragraph("Stage Group", table_header), Paragraph("Stages Included", table_header), Paragraph("Execution Description & Security Checks", table_header)],
        [
            Paragraph("<b>Build & Verification</b>", table_cell),
            Paragraph("1. Checkout<br/>2. npm ci<br/>3. Lint & Type Check<br/>4. Build<br/>5. Vitest Tests", table_cell),
            Paragraph("Enforces clean reproducible dependency installation, strict TypeScript static typing (<code>tsc --noEmit</code>), and automated unit/integration test suites publishing JUnit XML.", table_cell)
        ],
        [
            Paragraph("<b>Security Quality Gates</b>", table_cell),
            Paragraph("6. Publish Reports<br/>7. Sonar Quality Gate<br/>8. OWASP Scan<br/>9. Docker Build<br/>10. Trivy Scan", table_cell),
            Paragraph("Scans dependencies for CVEs with OWASP (<code>--failOnCVSS 7.0</code>); builds immutable Docker images; scans container layers with Aqua Trivy for HIGH and CRITICAL vulnerabilities.", table_cell)
        ],
        [
            Paragraph("<b>Deployment & Rollback</b>", table_cell),
            Paragraph("11. ECR Push<br/>12. Blue-Green Deploy<br/>13. Smoke Tests<br/>14. Traffic Switch<br/>15. Post-Verification", table_cell),
            Paragraph("Deploys Candidate (Green) workload; performs synthetic HTTP & WebSocket health checks; flips Kubernetes Service selector atomically; auto-rolls back if error rate spikes.", table_cell)
        ]
    ]
    t_stages = Table(stages_data, colWidths=[95, 125, 316])
    t_stages.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_stages)
    story.append(Spacer(1, 4))

    cicd_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>File in VS Code:</b> Open <code>Jenkinsfile</code> (highlight lines 33–250 showing declarative stages, timeout guards, and rollback blocks). "
            "2. <b>Live Jenkins UI:</b> Open <code>http://16.4.118.98:8080</code> (or SSH tunnel <code>localhost:8080</code>) to show the pipeline stage view with green pass badges.",
            callout_text
        )]
    ]
    t_cp = Table(cicd_proof, colWidths=[536])
    t_cp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#86efac')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_cp)
    story.append(Spacer(1, 8))

    # Section 4: Terraform (IaC Day-0)
    story.append(Paragraph("4. Terraform (Infrastructure as Code — Day-0)", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> HashiCorp Terraform AWS Provider v5.x, HCL, Local/S3 state backend.<br/>"
        "<b>Why Used & Alternatives:</b> Declarative, version-controlled cloud resource provisioning. Guarantees deterministic state reconciliation. Alternatives: CloudFormation (AWS-locked, verbose JSON/YAML), Pulumi (imperative code, steep learning curve), AWS CDK.<br/>"
        "<b>Key Architectural Change (Removal of Cloud-Init):</b> We explicitly removed 128 lines of monolithic <code>user_data</code> from <code>infra/terraform/compute.tf</code>. Cloud-init couples Day-0 hardware provisioning with Day-1 application configuration; updating a shell script in user_data forces Terraform to destroy and replace the EC2 instance, causing catastrophic database data loss.",
        body_style
    ))

    tf_data = [
        [Paragraph("Resource Name", table_header), Paragraph("Terraform Identifier", table_header), Paragraph("Configuration Details & Security Posture", table_header)],
        [
            Paragraph("<b>Virtual Private Cloud</b>", table_cell),
            Paragraph("<code>aws_vpc.main</code>", table_cell),
            Paragraph("CIDR <code>10.0.0.0/16</code>; DNS hostnames & support enabled. Provides isolated private network perimeter.", table_cell)
        ],
        [
            Paragraph("<b>Public Subnet</b>", table_cell),
            Paragraph("<code>aws_subnet.public</code>", table_cell),
            Paragraph("CIDR <code>10.0.1.0/24</code> in <code>ap-south-1a</code>; mapped to Internet Gateway via route table for public ingress.", table_cell)
        ],
        [
            Paragraph("<b>k3s Node Security Group</b>", table_cell),
            Paragraph("<code>aws_security_group.k3s_host</code>", table_cell),
            Paragraph("Ingress 80/443 (HTTP/HTTPS) open to <code>0.0.0.0/0</code>; Port 6443 (Kube API) and Port 22 (SSH) strictly restricted to admin CIDRs. Self-referencing intra-cluster ingress.", table_cell)
        ],
        [
            Paragraph("<b>Database Security Group</b>", table_cell),
            Paragraph("<code>aws_security_group.database</code>", table_cell),
            Paragraph("Port 5432 (PostgreSQL) strictly restricted to <code>k3s_host.id</code>. <b>ZERO public internet ingress allowed.</b>", table_cell)
        ],
        [
            Paragraph("<b>Compute Host</b>", table_cell),
            Paragraph("<code>aws_instance.k3s_host</code>", table_cell),
            Paragraph("Instance type: <code>c7i-flex.large</code> (2 vCPU, 4 GiB RAM); 40 GB gp3 EBS root volume (3000 IOPS, 125 MB/s).", table_cell)
        ]
    ]
    t_tf = Table(tf_data, colWidths=[105, 115, 316])
    t_tf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_tf)
    story.append(Spacer(1, 4))

    tf_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>File in VS Code:</b> Open <code>infra/terraform/compute.tf</code> and show that <code>user_data</code> has been stripped. "
            "2. <b>File in VS Code:</b> Open <code>infra/terraform/security_groups.tf</code> to demonstrate defense-in-depth DB network isolation. "
            "3. <b>Git Diff Proof:</b> Run <code>git diff v1.0.0 v1.1.0 infra/terraform/compute.tf</code> to show exact deletion of cloud-init.",
            callout_text
        )]
    ]
    t_tp = Table(tf_proof, colWidths=[536])
    t_tp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_tp)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: Section 5: Ansible & Section 6: Docker Containerization
    # =========================================================================
    story.append(Paragraph("5. Ansible (Configuration Management — Day-1 & Day-2)", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> Ansible Core 2.16+, YAML Playbooks, modular role structure (<code>common</code>, <code>docker</code>, <code>verification</code>), inventory grouping, and automated assertion tasks.<br/>"
        "<b>Why Used & Alternatives:</b> Provides agentless, idempotent configuration management over SSH. Only applies mutations when configuration drift occurs. Alternatives: Chef / Puppet (require persistent ruby/JVM agent daemons consuming 300-500 MB RAM on our single node), SaltStack, Raw Bash scripts (lack idempotency, state verification, and standardized error handling).",
        body_style
    ))

    ans_data = [
        [Paragraph("Role Name", table_header), Paragraph("Key Playbook Tasks", table_header), Paragraph("Idempotent Action & Verification", table_header)],
        [
            Paragraph("<b>roles/common</b>", table_cell),
            Paragraph("• OS Version Assertion<br/>• <code>apt</code> package cache update<br/>• Baseline utilities installation<br/>• Workspace directory setup", table_cell),
            Paragraph("Asserts Ubuntu 22.04+; installs <code>curl, git, htop, jq, unzip, ca-certificates</code>; guarantees <code>/home/ubuntu/workspace/resqgrid</code> exists with <code>0755</code> permissions.", table_cell)
        ],
        [
            Paragraph("<b>roles/docker</b>", table_cell),
            Paragraph("• Docker CLI verification<br/>• Systemd service assertion<br/>• Docker engine version check<br/>• Active container enumeration", table_cell),
            Paragraph("Guarantees <code>docker.service</code> is active and enabled on boot; asserts non-root <code>ubuntu</code> user is in <code>docker</code> group; queries active containers via Go template formatting.", table_cell)
        ],
        [
            Paragraph("<b>roles/verification</b>", table_cell),
            Paragraph("• <code>kubectl</code> binary assertion<br/>• <code>k3s</code> service status check<br/>• Kubernetes nodes ready check<br/>• Pod workload health assertion", table_cell),
            Paragraph("Executes automated sanity checks post-provisioning; asserts all nodes report <code>Ready</code>; validates all 6 application and monitoring pods report <code>1/1 Running</code>.", table_cell)
        ]
    ]
    t_ans = Table(ans_data, colWidths=[95, 135, 306])
    t_ans.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_ans)
    story.append(Spacer(1, 4))

    ans_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>Directory Layout:</b> Show <code>ansible/ansible.cfg</code>, <code>ansible/inventory/hosts.ini</code>, and <code>ansible/playbooks/site.yml</code>. "
            "2. <b>SSH Connectivity:</b> Run <code>ansible -i ansible/inventory/hosts.ini all -m ping</code> (Returns <code>SUCCESS: \"ping\": \"pong\"</code>). "
            "3. <b>Syntax Validation:</b> Run <code>ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/site.yml --syntax-check</code> (PASS).",
            callout_text
        )]
    ]
    t_ap = Table(ans_proof, colWidths=[536])
    t_ap.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#86efac')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_ap)
    story.append(Spacer(1, 8))

    # Section 6: Docker Containerization
    story.append(Paragraph("6. Docker Containerization Architecture", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> Docker Engine 24+, Multi-stage Dockerfiles (<code>Node 22 Alpine</code> & <code>Nginx 1.27 Alpine</code>), Non-root security context (<code>USER node</code>), Docker Compose for local orchestration.<br/>"
        "<b>Why Used & Alternatives:</b> Process isolation, eliminates environment drift, strips dev dependencies and compilers from runner images, and achieves sub-second startup. Alternatives: Podman (daemonless/rootless; Docker retained for Jenkins socket compatibility), containerd nerdctl, LXC.",
        body_style
    ))

    docker_data = [
        [Paragraph("Container Identifier", table_header), Paragraph("Runtime Layer", table_header), Paragraph("Base Image & Ports", table_header), Paragraph("Purpose & Architectural Rationale", table_header)],
        [
            Paragraph("<b>resqgrid-jenkins</b>", table_cell),
            Paragraph("Host Docker", table_cell),
            Paragraph("<code>jenkins/jenkins:lts</code><br/>Port: 8080, 50000", table_cell),
            Paragraph("CI/CD pipeline controller. Manages build workspaces and communicates with host Docker socket.", table_cell)
        ],
        [
            Paragraph("<b>backend</b>", table_cell),
            Paragraph("k3s containerd", table_cell),
            Paragraph("<code>node:22-alpine</code> (multi)<br/>Port: 4000 (Internal)", table_cell),
            Paragraph("Express REST API, real-time WebSocket hub, PostGIS query engine, and Prometheus metrics exporter.", table_cell)
        ],
        [
            Paragraph("<b>frontend</b>", table_cell),
            Paragraph("k3s containerd", table_cell),
            Paragraph("<code>nginx:1.27-alpine</code><br/>Port: 80 (Internal)", table_cell),
            Paragraph("Static single-page React SPA application server with client-side routing fallback and gzip compression.", table_cell)
        ],
        [
            Paragraph("<b>postgres</b>", table_cell),
            Paragraph("k3s containerd", table_cell),
            Paragraph("<code>postgres:16-alpine</code><br/>Port: 5432 (Internal)", table_cell),
            Paragraph("Relational database backing incident reports, citizen subscriptions, and audit logs. Attached to persistent volume.", table_cell)
        ],
        [
            Paragraph("<b>prometheus</b>", table_cell),
            Paragraph("k3s containerd", table_cell),
            Paragraph("<code>prom/prometheus:v2.45</code><br/>Port: 9090", table_cell),
            Paragraph("Time-series metrics engine scraping backend endpoints, Kubernetes pods, and node metrics.", table_cell)
        ],
        [
            Paragraph("<b>grafana</b>", table_cell),
            Paragraph("k3s containerd", table_cell),
            Paragraph("<code>grafana/grafana:10.2</code><br/>Port: 3000", table_cell),
            Paragraph("Telemetry dashboard rendering real-time graphs for CPU, memory, request rates, and WebSocket clients.", table_cell)
        ],
        [
            Paragraph("<b>alertmanager</b>", table_cell),
            Paragraph("k3s containerd", table_cell),
            Paragraph("<code>prom/alertmanager:v0.27</code><br/>Port: 9093", table_cell),
            Paragraph("Alert deduplication, grouping, and notification engine routing critical infrastructure alerts to email.", table_cell)
        ]
    ]
    t_dock = Table(docker_data, colWidths=[90, 65, 115, 266])
    t_dock.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_dock)
    story.append(Spacer(1, 4))

    dock_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>File in VS Code:</b> Open <code>infra/docker/backend.Dockerfile</code> (show Stage 1 <code>builder</code> vs Stage 2 <code>runner</code> and <code>USER node</code>). "
            "2. <b>File in VS Code:</b> Open <code>infra/docker/frontend.Dockerfile</code> (show Nginx multi-stage build and healthcheck). "
            "3. <b>Terminal Command:</b> Run <code>docker ps --format \"table {{.Names}}\\t{{.Image}}\\t{{.Status}}\"</code> on EC2.",
            callout_text
        )]
    ]
    t_dp = Table(dock_proof, colWidths=[536])
    t_dp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_dp)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: Section 7: Kubernetes & Section 8: Monitoring Stack
    # =========================================================================
    story.append(Paragraph("7. Kubernetes Orchestration (k3s Cluster Architecture)", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> k3s (Lightweight CNCF Kubernetes v1.28+), Kustomize manifests, Deployments, Services (ClusterIP), Traefik Ingress Controller, Horizontal Pod Autoscaler (HPA), ConfigMaps, and Secrets.<br/>"
        "<b>Why k3s & Resource Count:</b> k3s packages Kubernetes into a single binary (<70 MB), uses embedded SQLite/kine instead of heavy etcd, includes Traefik Ingress out of the box, and operates at <b>~550 MiB RAM overhead</b> (vs 2+ GiB for kubeadm/EKS). Cluster holds <b>6 Pods</b>, <b>5 Services</b>, <b>1 Ingress</b>, and <b>1 HPA</b>.",
        body_style
    ))

    k8s_data = [
        [Paragraph("Kubernetes Resource", table_header), Paragraph("Kind & Namespace", table_header), Paragraph("Port / Routing Specification", table_header), Paragraph("High Availability & Operational Role", table_header)],
        [
            Paragraph("<b>backend-deployment</b>", table_cell),
            Paragraph("Deployment<br/><code>resqgrid</code>", table_cell),
            Paragraph("TargetPort: 4000<br/>Service: <code>backend-service</code>", table_cell),
            Paragraph("Managed by HPA (min 2, max 5 replicas based on 60% CPU target). Includes readiness & liveness probes.", table_cell)
        ],
        [
            Paragraph("<b>frontend-deployment</b>", table_cell),
            Paragraph("Deployment<br/><code>resqgrid</code>", table_cell),
            Paragraph("TargetPort: 80<br/>Service: <code>frontend-service</code>", table_cell),
            Paragraph("Serves static SPA web bundle. Managed via rolling update strategy (maxSurge: 1, maxUnavailable: 0).", table_cell)
        ],
        [
            Paragraph("<b>postgres-deployment</b>", table_cell),
            Paragraph("Deployment<br/><code>resqgrid</code>", table_cell),
            Paragraph("TargetPort: 5432<br/>Service: <code>postgres-service</code>", table_cell),
            Paragraph("Mounted to <code>local-path</code> PersistentVolumeClaim. Retains database records across pod restarts.", table_cell)
        ],
        [
            Paragraph("<b>resqgrid-ingress</b>", table_cell),
            Paragraph("Ingress<br/><code>resqgrid</code>", table_cell),
            Paragraph("Host Ingress: 80 / 443<br/>Traefik Provider", table_cell),
            Paragraph("Unified edge routing: <code>/api, /socket.io, /health, /metrics</code> routed to backend; <code>/</code> routed to frontend.", table_cell)
        ],
        [
            Paragraph("<b>resqgrid-backend-hpa</b>", table_cell),
            Paragraph("HPA<br/><code>resqgrid</code>", table_cell),
            Paragraph("Target: <code>backend-deployment</code><br/>Metric: CPU > 60%", table_cell),
            Paragraph("Dynamically scales backend pod replicas up to 5 during emergency disaster report spikes.", table_cell)
        ]
    ]
    t_k8s = Table(k8s_data, colWidths=[105, 95, 125, 211])
    t_k8s.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_k8s)
    story.append(Spacer(1, 4))

    k8s_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>File in VS Code:</b> Open <code>infra/k8s/ingress.yaml</code> and <code>infra/k8s/deployment.yaml</code>. "
            "2. <b>Live Workload Query:</b> Run <code>kubectl get pods -n resqgrid -o wide</code> (shows all 6 pods 1/1 Running with 0 restarts). "
            "3. <b>Service & Ingress Query:</b> Run <code>kubectl get svc,ingress,hpa -n resqgrid</code> (validates ClusterIP bindings and Traefik routing).",
            callout_text
        )]
    ]
    t_kp = Table(k8s_proof, colWidths=[536])
    t_kp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#86efac')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_kp)
    story.append(Spacer(1, 8))

    # Section 8: Monitoring & Observability Stack
    story.append(Paragraph("8. Monitoring Tools & Observability Stack", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> Prometheus v2.45+ (Scraper & TSDB), Grafana v10.2 (Dashboard Visualization), Alertmanager v0.27.0 (Alert Dispatcher & Router), Gmail SMTP Relay.<br/>"
        "<b>Why Used & Alternatives:</b> Telemetry across physical node hardware, container runtimes, and application HTTP/WebSocket performance. Proactively routes critical alerts to email. Alternatives: Datadog / New Relic ($15–$30/host/month plus ingestion costs), AWS CloudWatch (high alarm fees, proprietary syntax).",
        body_style
    ))

    alerts_data = [
        [Paragraph("Alert Rule Name", table_header), Paragraph("PromQL Expression", table_header), Paragraph("Threshold & Duration", table_header), Paragraph("Severity & Prescribed Action", table_header)],
        [
            Paragraph("<b>ResQGridBackendDown</b>", table_cell),
            Paragraph("<code>up{job=\"resqgrid-backend-service\"} == 0</code>", table_cell),
            Paragraph("Target unreachable for <b>> 1 minute</b>", table_cell),
            Paragraph("<b>CRITICAL</b><br/>Immediate alert dispatch. Indicates pod crash or unhandled runtime termination.", table_cell)
        ],
        [
            Paragraph("<b>ResQGridHighErrorRate</b>", table_cell),
            Paragraph("<code>sum(rate(http_requests_total{status_code=~\"5..\"}[2m])) / sum(rate(http_requests_total[2m])) * 100 > 5</code>", table_cell),
            Paragraph("5xx error rate <b>> 5%</b> over 2m window", table_cell),
            Paragraph("<b>WARNING</b><br/>Triggers notification when database connection pools or external upstream APIs fail.", table_cell)
        ],
        [
            Paragraph("<b>ResQGridHighRequestLatency</b>", table_cell),
            Paragraph("<code>histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[2m])) by (le)) > 1.5</code>", table_cell),
            Paragraph("p95 latency <b>> 1.5 seconds</b> for > 2m", table_cell),
            Paragraph("<b>WARNING</b><br/>Flags application thread starvation, slow spatial queries, or pending database locks.", table_cell)
        ],
        [
            Paragraph("<b>ResQGridEventLoopBlocked</b>", table_cell),
            Paragraph("<code>nodejs_eventloop_lag_seconds > 0.2</code>", table_cell),
            Paragraph("Event loop delay <b>> 200ms</b> for > 1m", table_cell),
            Paragraph("<b>WARNING</b><br/>Identifies synchronous blocking computations in Node.js event loop.", table_cell)
        ],
        [
            Paragraph("<b>ResQGridHighMemoryUsage</b>", table_cell),
            Paragraph("<code>(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100 > 85</code>", table_cell),
            Paragraph("Heap utilization <b>> 85%</b> for > 3m", table_cell),
            Paragraph("<b>WARNING</b><br/>Early warning of potential memory leaks before the Linux kernel triggers OOM-kill.", table_cell)
        ]
    ]
    t_al = Table(alerts_data, colWidths=[110, 150, 110, 166])
    t_al.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_al)
    story.append(Spacer(1, 4))

    mon_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>File in VS Code:</b> Open <code>infra/k8s/prometheus.yaml</code> (highlight lines 108–168) and <code>infra/k8s/alertmanager.yaml</code>. "
            "2. <b>Live Prometheus UI:</b> <code>http://16.4.118.98:9090/alerts</code> (show rules) and <code>:9090/targets</code> (show healthy endpoints). "
            "3. <b>Live Grafana Dashboard:</b> <code>http://16.4.118.98:3000</code>. "
            "4. <b>Email Proof:</b> Live email at <code>baranwaldevansh2004@gmail.com</code>: <code>[ResQGrid Alert] FIRING/RESOLVED</code>.",
            callout_text
        )]
    ]
    t_mp = Table(mon_proof, colWidths=[536])
    t_mp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_mp)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: Section 9: Security & Section 10: Location Service
    # =========================================================================
    story.append(Paragraph("9. Security Tools & DevSecOps (Why SonarQube Was Replaced)", h1_style))
    story.append(Paragraph(
        "<b>What is Used:</b> Aqua Trivy (Container layer CVE scanner), OWASP Dependency-Check (Software Composition Analysis), TypeScript strict mode (<code>tsc --noEmit</code>), AWS Security Groups defense-in-depth, Docker non-root users (<code>USER node</code>), and Kubernetes Secrets.<br/>"
        "<b>The SonarQube Memory Trade-Off (Why It Was Removed):</b><br/>"
        "• SonarQube Community Edition requires a dedicated Java 17+ JVM and an embedded Elasticsearch cluster, mandating <code>vm.max_map_count >= 262144</code> and <b>3–4 GiB of dedicated heap RAM</b>.<br/>"
        "• Our single AWS EC2 instance (<code>c7i-flex.large</code>) possesses 4 GiB total RAM hosting k3s, Jenkins, PostgreSQL, and Prometheus. Running SonarQube pushes memory usage above 95%, triggering the Linux kernel Out-Of-Memory (OOM) killer, which terminates critical application pods.<br/>"
        "• <b>Strategic DevOps Solution:</b> We tested SonarQube in branch <code>feature/security-and-monitoring</code>, simulated a quality gate failure documented in release <code>v1.2.0-rc1</code> (see <code>docs/failures/build-fail-sonarqube-qualitygate.log</code>), and then strategically migrated to lightweight ephemeral security tools (Aqua Trivy + OWASP Dependency-Check + strict TypeScript compilation) in <code>v2.0.0</code>. These tools run ephemerally during CI builds with <b>< 250 MB peak memory</b>, achieving equivalent SAST/SCA security without destabilizing production workloads.",
        body_style
    ))

    sec_data = [
        [Paragraph("Tool Name", table_header), Paragraph("Security Domain", table_header), Paragraph("Memory Footprint", table_header), Paragraph("Enforcement Mechanism in Pipeline", table_header)],
        [
            Paragraph("<b>Aqua Trivy</b>", table_cell),
            Paragraph("Container Image Scanning", table_cell),
            Paragraph("< 150 MB (Ephemeral)", table_cell),
            Paragraph("Scans container image OS packages & npm dependencies. Halts build on <code>HIGH</code> or <code>CRITICAL</code> CVEs.", table_cell)
        ],
        [
            Paragraph("<b>OWASP Dependency-Check</b>", table_cell),
            Paragraph("Software Composition (SCA)", table_cell),
            Paragraph("< 200 MB (Ephemeral)", table_cell),
            Paragraph("Analyzes <code>package-lock.json</code> against the NVD database; fails pipeline if CVSS >= 7.0.", table_cell)
        ],
        [
            Paragraph("<b>Strict TypeScript Compiler</b>", table_cell),
            Paragraph("Static Application Analysis (SAST)", table_cell),
            Paragraph("< 120 MB (Ephemeral)", table_cell),
            Paragraph("Enforces strict type safety (<code>noImplicitAny</code>, null checks); prevents null pointer dereference bugs.", table_cell)
        ],
        [
            Paragraph("<b>AWS Security Groups</b>", table_cell),
            Paragraph("Network Boundary Defense", table_cell),
            Paragraph("0 MB (AWS Hypervisor)", table_cell),
            Paragraph("Restricts DB port 5432 to k3s host; blocks public ingress to Kube API port 6443 and SSH port 22.", table_cell)
        ],
        [
            Paragraph("<b>SonarQube (Evaluated)</b>", table_cell),
            Paragraph("Monolithic SAST & Quality Gate", table_cell),
            Paragraph("<b>3.5–4.0 GiB (Resident)</b><br/><font color='#b91c1c'><b>Causes OOM Panic</b></font>", table_cell),
            Paragraph("Evaluated & documented in <code>v1.2.0-rc1</code>. Replaced by lightweight tooling to guarantee cluster uptime.", table_cell)
        ]
    ]
    t_sec = Table(sec_data, colWidths=[105, 115, 105, 211])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 4))

    sec_proof = [
        [Paragraph(
            "<b>PROOF TO SHOW MENTOR:</b> "
            "1. <b>File in VS Code:</b> Open <code>docs/failures/build-fail-sonarqube-qualitygate.log</code> (show simulated SonarQube failure in build #5). "
            "2. <b>File in VS Code:</b> Open <code>ansible/README.md</code> (section explaining memory trade-offs and lightweight security replacement). "
            "3. <b>Release Tag:</b> Show GitHub Release <code>v1.2.0-rc1</code> where the failure was recorded as part of the version control journey.",
            callout_text
        )]
    ]
    t_sp = Table(sec_proof, colWidths=[536])
    t_sp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fca5a5')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_sp)
    story.append(Spacer(1, 8))

    # Section 10: Location Service & Browser Security
    story.append(Paragraph("10. Website Functionality: Location Service & Browser Security", h1_style))
    story.append(Paragraph(
        "<b>Mentor Inquiry:</b> <i>'Why does the location service prompt for manual pins or show an HTTPS warning when accessing the website over http://16.4.118.98?'</i><br/>"
        "<b>Technical Defense:</b><br/>"
        "• <b>W3C Secure Context Specification:</b> Modern web browsers (Chrome, Firefox, Safari, Edge) strictly prohibit hardware APIs—specifically <code>navigator.geolocation</code>—from executing over non-secure origins (plain HTTP public IP addresses). This is an RFC-standard browser sandbox security gate, not an application defect.<br/>"
        "• <b>Built-in Fallback Engineering:</b> Because our staging environment operates directly on a public IP address without an external domain name, we implemented a dual-mode strategy in the React frontend: client-side GPS detection with an automated fallback to campus test pins and manual coordinate injection.<br/>"
        "• <b>Production Ingress Posture:</b> In production with a domain, TLS termination is handled at the Ingress layer (Traefik with cert-manager Let's Encrypt or an AWS ALB with ACM), providing full HTTPS.",
        body_style
    ))

    loc_data = [
        [Paragraph("Demonstration Method", table_header), Paragraph("Exact Steps to Perform Live for Mentor", table_header), Paragraph("Outcome / Verification Displayed on Screen", table_header)],
        [
            Paragraph("<b>Method 1: 1-Click Campus Pin</b><br/>(Recommended — 0 Setup)", table_cell_bold),
            Paragraph("1. Open <code>http://16.4.118.98</code> in any browser.<br/>2. Note the yellow HTTPS explanation banner.<br/>3. Click the <b>\"SRMIST Campus Pin (Manual)\"</b> button.", table_cell),
            Paragraph("Map instantly anchors to SRMIST coordinates (<code>12.8230°N, 80.0444°E</code>), draws the notification perimeter circle (10–250 km), and calculates live proximity to incidents.", table_cell)
        ],
        [
            Paragraph("<b>Method 2: Chrome Insecure Flag</b><br/>(10-Second Real GPS Demo)", table_cell_bold),
            Paragraph("1. Open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>.<br/>2. Enter: <code>http://16.4.118.98</code> and set to <b>Enabled</b>.<br/>3. Click <b>Relaunch</b> and reload site.", table_cell),
            Paragraph("Chrome grants full GPS access over HTTP. Clicking <b>\"Enable My Location\"</b> prompts for device GPS and acquires your exact live coordinates.", table_cell)
        ],
        [
            Paragraph("<b>Method 3: Localhost Port Forward</b><br/>(Native Secure Context)", table_cell_bold),
            Paragraph("1. Run in PowerShell: <code>ssh -i key.pem -L 3000:localhost:80 ubuntu@16.4.118.98</code>.<br/>2. Open <code>http://localhost:3000</code> in your browser.", table_cell),
            Paragraph("Browsers treat <code>localhost</code> as an intrinsically secure origin (<code>window.isSecureContext === true</code>). Device GPS activates without any flags.", table_cell)
        ]
    ]
    t_loc = Table(loc_data, colWidths=[120, 205, 211])
    t_loc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_loc)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: Section 11: Mentor Viva & Defense Q&A Sheet & Final Sign-Off
    # =========================================================================
    story.append(Paragraph("11. Mentor Viva Defense Sheet (Tough Questions & Authoritative Answers)", h1_style))
    story.append(Paragraph(
        "Use these structured talking points to answer common questions from mentors and external examiners during project evaluation.",
        body_style
    ))

    qa_items = [
        (
            "Q1: Why did you separate Terraform from Ansible instead of using cloud-init for everything?",
            "<b>Authoritative Answer:</b> Terraform is designed for Day-0 infrastructure provisioning (VPCs, subnets, hypervisors, security groups), while Ansible is designed for Day-1/Day-2 configuration management (packages, systemd services, users, verification). Putting 128 lines of bash in cloud-init makes the instance immutable in the wrong way: modifying a single script line forces Terraform to destroy and replace the running EC2 instance, causing catastrophic database data loss. Ansible provides agentless, idempotent configuration drift correction without re-creating virtual hardware."
        ),
        (
            "Q2: How does your architecture ensure zero downtime during software updates?",
            "<b>Authoritative Answer:</b> In our Jenkinsfile and Kubernetes manifests, we implement Blue-Green deployments and Kubernetes rolling updates. When a new commit is merged, Jenkins builds the new container image and deploys Candidate pods alongside the active pods. Automated pre-promotion smoke tests verify health and WebSocket endpoints. Only after smoke tests pass does the Kubernetes Service selector switch traffic atomically. If smoke tests fail, the candidate is discarded and production traffic never drops a single packet."
        ),
        (
            "Q3: Why did you not keep SonarQube running inside your Kubernetes cluster?",
            "<b>Authoritative Answer:</b> We conducted a thorough resource economics analysis on our single AWS EC2 instance (c7i-flex.large, 4 GiB RAM). SonarQube Community Edition requires a dedicated Java 17+ JVM and an embedded Elasticsearch cluster, requiring vm.max_map_count >= 262144 and 3–4 GiB of dedicated heap memory. Running SonarQube pushes memory usage above 95%, triggering the Linux kernel Out-Of-Memory (OOM) killer, which terminates critical application pods. We solved this by implementing an ephemeral 3-tier DevSecOps gate: Aqua Trivy container scanning + OWASP Dependency-Check + strict TypeScript compilation. This achieves identical SAST/SCA security coverage with <250 MB peak RAM while maintaining 100% cluster stability."
        ),
        (
            "Q4: How do you prove that your monitoring stack actually detects outages and notifies engineers?",
            "<b>Authoritative Answer:</b> We configured Prometheus scrape configs for all application pods and node metrics, paired with 5 prescribed alert rules (ResQGridBackendDown, ResQGridHighErrorRate, ResQGridHighRequestLatency, ResQGridEventLoopBlocked, ResQGridHighMemoryUsage). Alertmanager routes alerts via Gmail SMTP relay. We proved this by dispatching a synthetic test alert to baranwaldevansh2004@gmail.com; both the FIRING and RESOLVED notifications were received and confirmed in the inbox."
        )
    ]

    for q, a in qa_items:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    story.append(Paragraph(
        "<b>Document Status:</b> Verified & Finalized for Academic Defense | <b>Institution:</b> SRM Institute of Science and Technology<br/>"
        "<b>Repository:</b> <code>https://github.com/RichieRichard0000/resqgrid-devops</code> | <b>Latest Release:</b> <code>v2.0.0</code>",
        table_cell
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated clean 6-page PDF: {filename}")

if __name__ == "__main__":
    output_pdf = "DevOps_Project_Mentor_Proof_and_Defense_Guide.pdf"
    if len(sys.argv) > 1:
        output_pdf = sys.argv[1]
    build_pdf(output_pdf)
