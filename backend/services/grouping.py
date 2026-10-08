from sqlalchemy.orm import Session
from models import Complaint, IssueGroup, ComplaintGroupMember, Sector
from services.classifier import calculate_text_similarity
from services.priority_engine import calculate_priority_score, get_priority_label
import json

def process_complaint_grouping(db: Session, complaint: Complaint):
    # Find active groups in the same sector
    active_groups = db.query(IssueGroup).filter(
        IssueGroup.sector_id == complaint.sector_id,
        IssueGroup.status == "active"
    ).all()
    
    best_match_group = None
    best_match_score = 0.0
    
    complaint_text = f"{complaint.title} {complaint.description}"
    
    for group in active_groups:
        # Check similarity against the group's title and description
        group_text = f"{group.title} {group.description}"
        sim = calculate_text_similarity(complaint_text, group_text)
        
        if sim > 0.3 and sim > best_match_score: # Threshold
            best_match_score = sim
            best_match_group = group
            
    if best_match_group:
        # Add to existing group
        member = ComplaintGroupMember(
            complaint_id=complaint.id,
            issue_group_id=best_match_group.id,
            similarity_score=best_match_score
        )
        db.add(member)
        
        # Update group stats
        best_match_group.complaint_count += 1
        best_match_group.affected_users += 1
        
        locs = json.loads(best_match_group.affected_locations) if isinstance(best_match_group.affected_locations, str) else best_match_group.affected_locations
        if not locs: locs = []
        if complaint.location not in locs:
            locs.append(complaint.location)
        best_match_group.affected_locations = json.dumps(locs) if isinstance(best_match_group.affected_locations, str) else locs
        
        # Recalculate priority
        score = calculate_priority_score(
            severity="medium", 
            frequency=best_match_group.complaint_count, 
            affected_users=best_match_group.affected_users,
            recent_increase=1.5,
            location_spread=len(locs)
        )
        best_match_group.priority = get_priority_label(score)
        
        db.commit()
        return best_match_group
    else:
        # Create new group
        new_group = IssueGroup(
            title=f"Issue: {complaint.title[:50]}...",
            description=complaint.description,
            sector_id=complaint.sector_id,
            category=complaint.category,
            complaint_count=1,
            affected_users=1,
            affected_locations=[complaint.location], # Assuming JSON type supports lists in this sqlite setup or string
            trend_percentage=0.0,
            priority=complaint.priority,
            status="active"
        )
        db.add(new_group)
        db.commit()
        db.refresh(new_group)
        
        member = ComplaintGroupMember(
            complaint_id=complaint.id,
            issue_group_id=new_group.id,
            similarity_score=1.0
        )
        db.add(member)
        db.commit()
        return new_group
