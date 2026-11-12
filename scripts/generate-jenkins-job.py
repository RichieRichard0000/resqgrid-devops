import os

with open('Jenkinsfile', 'r', encoding='utf-8') as f:
    jenkinsfile = f.read()

xml = """<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@1602.v2a_70b_80a_2396">
  <description>ResQGrid — Real-Time Disaster Alert &amp; Response Platform CI/CD Pipeline</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty/>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@4383.v04fa_a_3d67b_d9">
    <script><![CDATA[""" + jenkinsfile + """]]></script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
"""

with open('resqgrid-job.xml', 'w', encoding='utf-8') as f:
    f.write(xml)

print("Generated resqgrid-job.xml successfully")
