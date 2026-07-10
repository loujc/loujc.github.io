---
title: 'PDBench: LLM-Based Benchmark Generation for Physical Design Tool Validation'
authors:
  - me
  - Jiecheng Ma
  - Runzhe Tao
  - Yifan Chen
  - Chunyuan Zhao
  - Yuhao Ji
  - Yuxiang Zhao
  - Xun Jiang
  - Ruohan Xu
  - Jing Mai
  - Zhiang Wang
  - Zhixiong Di
  - Bei Yu
  - Yibo Lin
date: '2026-04-15T00:00:00Z'
publishDate: '2026-04-15T00:00:00Z'
publication_types: ['manuscript']
publication:
  name: Under Review
  short_name: Under Review
peer_reviewed: false
open_access: false
abstract: >-
  Physical-design tool quality directly affects chip quality, yet public benchmarks are scarce and designed primarily for contests rather than tool validation. PDBench is a validation-oriented, constraint-aware framework that parses PDK contents into a shared database, generates stage-specific DEF and gate-level Verilog under cross-file and stage-specific constraints, and verifies each case with golden reference tools. Across four open PDKs and four LLM backends, all 16 settings pass golden verification. Compared with contest benchmarks, generated cases improve top-level DEF coverage by 2.0-2.2x and overall DEF coverage by 2.7-4.7x. Fifty-six directed placement cases expose five independent defects in DREAMPlace and one in OpenROAD, while all 56 pass Innovus verification.
summary: Constraint-aware LLM benchmark generation for validating physical-design tools across PDKs.
tags:
  - Physical Design
  - Benchmark Generation
  - LLM Agents
featured: false
---
