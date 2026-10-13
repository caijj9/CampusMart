package com.itcjj.campusmart.service;

import com.itcjj.campusmart.dto.LoginDTO;
import com.itcjj.campusmart.dto.PasswordDTO;
import com.itcjj.campusmart.entity.User;
import com.itcjj.campusmart.vo.UserAdminVO;
import com.itcjj.campusmart.vo.UserProfileVO;
import java.util.List;
import com.itcjj.campusmart.dto.UserDTO;
import org.springframework.web.multipart.MultipartFile;


public interface UserService{
    List<UserAdminVO> listAll();
    void add (UserDTO dto);
    void update(UserDTO dto);
    void delete(Long id);
    String login (LoginDTO dto);
    UserProfileVO getCurrentUser();
    void updatePassword(PasswordDTO dto);
    String uploadAvatar(MultipartFile file);
    void disableUser(Long id) ;
    void enableUser(Long id);

}
